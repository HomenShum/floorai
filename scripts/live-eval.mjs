import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { GoogleGenAI } from "@google/genai";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const AGENT_CHAT = makeFunctionReference("agent:chat");

function parseDotEnv(contents) {
  const env = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) continue;
    const key = line.slice(0, equalsIndex).trim();
    const value = line.slice(equalsIndex + 1).trim();
    env[key] = value;
  }
  return env;
}

async function loadLocalEnv() {
  try {
    const envPath = path.join(PROJECT_ROOT, ".env.local");
    const contents = await fs.readFile(envPath, "utf8");
    return parseDotEnv(contents);
  } catch {
    return {};
  }
}

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function keywordCoverage(response, requiredTerms) {
  if (!requiredTerms.length) return 1;
  const haystack = response.toLowerCase();
  const hits = requiredTerms.filter((term) =>
    haystack.includes(String(term).toLowerCase())
  );
  return hits.length / requiredTerms.length;
}

async function main() {
  const envFile = await loadLocalEnv();
  const convexUrl =
    process.env.NEXT_PUBLIC_CONVEX_URL || envFile.NEXT_PUBLIC_CONVEX_URL;
  const googleApiKey =
    process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_API_KEY ||
    envFile.GOOGLE_API_KEY ||
    envFile.GEMINI_API_KEY;

  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is required to run the live evaluator.");
  }
  if (!googleApiKey) {
    throw new Error("GOOGLE_API_KEY or GEMINI_API_KEY is required to run the live evaluator.");
  }

  const limit = Number(getArgValue("--limit") || "0") || undefined;
  const datasetPath = path.join(PROJECT_ROOT, "data", "golden_dataset.json");
  const cases = JSON.parse(await fs.readFile(datasetPath, "utf8"));
  const selectedCases = limit ? cases.slice(0, limit) : cases;

  const convex = new ConvexHttpClient(convexUrl);
  const judge = new GoogleGenAI({ apiKey: googleApiKey });
  const results = [];

  for (const testCase of selectedCases) {
    const sessionId = `live-eval-${testCase.id}-${Date.now()}`;
    const response = await convex.action(AGENT_CHAT, {
      query: testCase.query,
      storeId: testCase.storeId,
      regionId: testCase.regionId,
      sessionId,
    });

    const actualResponse = typeof response === "string" ? response : JSON.stringify(response);
    const foundRefs = testCase.required_references.filter((reference) =>
      actualResponse.toLowerCase().includes(String(reference).toLowerCase())
    );
    const missingRefs = testCase.required_references.filter(
      (reference) => !foundRefs.includes(reference)
    );

    const judgePrompt = `You are grading an operations-assistant response against a preferred response.

Score from 1 to 5 on:
- factual_alignment
- policy_grounding
- actionability
- overall_score

Evaluation rules:
- Reward exact issue IDs, policy IDs, dates, thresholds, and escalation steps.
- Penalize hallucinated facts, missing required policy references, or generic advice.
- The response does not need to copy the preferred wording, but it must preserve the same operational intent.

Return only valid JSON with this shape:
{"overall_score":0,"factual_alignment":0,"policy_grounding":0,"actionability":0,"summary":"","strengths":[],"gaps":[],"verdict":""}

Case ID: ${testCase.id}
Prompt:
${testCase.query}

Preferred response:
${testCase.preferred_response}

Required references:
${JSON.stringify(testCase.required_references, null, 2)}

Agent response:
${actualResponse}`;

    const judgeResponse = await judge.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: judgePrompt,
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });

    let verdict;
    try {
      verdict = JSON.parse(judgeResponse.text ?? "{}");
    } catch {
      verdict = {
        overall_score: 0,
        factual_alignment: 0,
        policy_grounding: 0,
        actionability: 0,
        summary: "Judge output could not be parsed.",
        strengths: [],
        gaps: ["Judge output parse failure."],
        verdict: "fail",
      };
    }

    results.push({
      case_id: testCase.id,
      query: testCase.query,
      response: actualResponse,
      keyword_coverage: Number(keywordCoverage(actualResponse, testCase.required_references).toFixed(3)),
      found_refs: foundRefs,
      missing_refs: missingRefs,
      verdict,
    });
  }

  const passed = results.filter((result) => String(result.verdict.verdict).toLowerCase() === "pass");
  const summary = {
    status: "ok",
    convex_url: convexUrl,
    cases: results.length,
    passes: passed.length,
    average_overall_score:
      results.reduce((sum, result) => sum + Number(result.verdict.overall_score || 0), 0) /
      Math.max(results.length, 1),
    average_keyword_coverage:
      results.reduce((sum, result) => sum + Number(result.keyword_coverage || 0), 0) /
      Math.max(results.length, 1),
  };

  const outputDir = path.join(PROJECT_ROOT, "eval_results");
  await fs.mkdir(outputDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputPath = path.join(outputDir, `live_eval_${timestamp}.json`);
  await fs.writeFile(
    outputPath,
    JSON.stringify({ summary, results }, null, 2),
    "utf8"
  );

  console.log(
    JSON.stringify(
      {
        ...summary,
        output: outputPath,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
