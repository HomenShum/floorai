from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean
from typing import Any

from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field

from .agent import run_agent_prompt
from .config import EVAL_RESULTS_DIR, MODEL_NAME, google_api_key
from .data_loader import load_goldens, load_issues, load_policies, normalize_text


class JudgeVerdict(BaseModel):
    overall_score: int = Field(ge=1, le=5)
    factual_alignment: int = Field(ge=1, le=5)
    policy_grounding: int = Field(ge=1, le=5)
    actionability: int = Field(ge=1, le=5)
    summary: str
    strengths: list[str]
    gaps: list[str]
    verdict: str


@dataclass
class CaseResult:
    case_id: str
    overall_score: int
    factual_alignment: int
    policy_grounding: int
    actionability: int
    keyword_coverage: float
    verdict: str
    response: str
    summary: str
    strengths: list[str]
    gaps: list[str]

    def as_dict(self) -> dict[str, Any]:
        return {
            "case_id": self.case_id,
            "overall_score": self.overall_score,
            "factual_alignment": self.factual_alignment,
            "policy_grounding": self.policy_grounding,
            "actionability": self.actionability,
            "keyword_coverage": round(self.keyword_coverage, 3),
            "verdict": self.verdict,
            "response": self.response,
            "summary": self.summary,
            "strengths": self.strengths,
            "gaps": self.gaps,
        }


def validate_reference_data() -> dict[str, int]:
    issues = load_issues()
    policies = load_policies()
    goldens = load_goldens()
    return {
        "issues": len(issues),
        "policies": len(policies),
        "goldens": len(goldens),
    }


def keyword_coverage(response: str, required_terms: list[str]) -> float:
    if not required_terms:
        return 1.0
    haystack = normalize_text(response)
    hits = sum(1 for term in required_terms if normalize_text(term) in haystack)
    return hits / len(required_terms)


def create_judge():
    api_key = google_api_key()
    if not api_key:
        raise RuntimeError(
            "Missing GOOGLE_API_KEY or GEMINI_API_KEY. The live judge cannot run without a Google API key."
        )

    judge_model = ChatGoogleGenerativeAI(
        model=MODEL_NAME,
        temperature=1.0,
        api_key=api_key,
        max_retries=2,
    )
    return judge_model.with_structured_output(JudgeVerdict)


def judge_case(case: dict[str, Any], response: str) -> JudgeVerdict:
    judge = create_judge()
    prompt = f"""
You are grading an operations-assistant response against a preferred response.

Score from 1 to 5 on:
- factual_alignment
- policy_grounding
- actionability
- overall_score

Evaluation rules:
- Reward exact issue IDs, policy IDs, dates, thresholds, and escalation steps.
- Penalize hallucinated facts, missing required policy references, or generic advice.
- The response does not need to copy the preferred wording, but it must preserve the same operational intent.
- A passing verdict should usually require strong factual alignment and policy grounding.

Case ID: {case["case_id"]}
Prompt:
{case["prompt"]}

Preferred response:
{case["preferred_response"]}

Required references:
{json.dumps(case["must_include"], indent=2)}

Agent response:
{response}
""".strip()
    return judge.invoke(prompt)


def evaluate_case(case: dict[str, Any], *, debug: bool = False) -> CaseResult:
    response = run_agent_prompt(case["prompt"], thread_id=f"eval-{case['case_id']}", debug=debug)
    coverage = keyword_coverage(response, case.get("must_include", []))
    verdict = judge_case(case, response)
    if coverage < 0.6 and verdict.verdict.lower() == "pass":
        verdict.verdict = "fail"
        verdict.gaps.append("Required-reference coverage fell below 60 percent.")

    return CaseResult(
        case_id=case["case_id"],
        overall_score=verdict.overall_score,
        factual_alignment=verdict.factual_alignment,
        policy_grounding=verdict.policy_grounding,
        actionability=verdict.actionability,
        keyword_coverage=coverage,
        verdict=verdict.verdict,
        response=response,
        summary=verdict.summary,
        strengths=verdict.strengths,
        gaps=verdict.gaps,
    )


def save_results(results: list[CaseResult], *, output_dir: Path | None = None) -> Path:
    destination = output_dir or EVAL_RESULTS_DIR
    destination.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    output_path = destination / f"golden_eval_{timestamp}.json"
    payload = {
        "model": MODEL_NAME,
        "generated_at": timestamp,
        "case_count": len(results),
        "pass_rate": round(
            sum(1 for result in results if result.verdict.lower() == "pass") / max(len(results), 1),
            3,
        ),
        "average_overall_score": round(mean(result.overall_score for result in results), 3),
        "average_keyword_coverage": round(mean(result.keyword_coverage for result in results), 3),
        "results": [result.as_dict() for result in results],
    }
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return output_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate the retail ops agent against preferred-response goldens.")
    parser.add_argument("--validate-only", action="store_true", help="Validate local reference datasets without invoking Gemini.")
    parser.add_argument("--limit", type=int, default=None, help="Limit the number of golden cases to run.")
    parser.add_argument("--debug", action="store_true", help="Enable Deep Agents debug mode.")
    args = parser.parse_args()

    stats = validate_reference_data()
    if args.validate_only:
        print(json.dumps({"status": "ok", **stats}, indent=2))
        return

    if not google_api_key():
        raise RuntimeError(
            "Missing GOOGLE_API_KEY or GEMINI_API_KEY. Run with --validate-only or export a Google API key."
        )

    cases = load_goldens()
    if args.limit is not None:
        cases = cases[: args.limit]

    results = [evaluate_case(case, debug=args.debug) for case in cases]
    output_path = save_results(results)
    summary = {
        "status": "ok",
        "output": str(output_path),
        "cases": len(results),
        "passes": sum(1 for result in results if result.verdict.lower() == "pass"),
        "average_overall_score": round(mean(result.overall_score for result in results), 3),
        "average_keyword_coverage": round(mean(result.keyword_coverage for result in results), 3),
    }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
