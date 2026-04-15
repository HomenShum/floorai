# Retail Ops Agent Workflow

This repository adopts the lifecycle and quality bar from `addyosmani/agent-skills`, adapted for a retail operations AI product built with Next.js, Convex, Gemini, and Python Deep Agents.

## Default Workflow

Use this order for any non-trivial change:

1. `/spec`
Define the user outcome, acceptance criteria, data dependencies, and evaluation plan before changing code.

2. `/plan`
Break work into thin vertical slices. Keep each slice independently testable and rollback-friendly.

3. `/build`
Implement one slice at a time. Favor explicit data flow, source-backed framework usage, and low-risk changes.

4. `/test`
Run the smallest proof that the change works. For agent work, this includes golden dataset evaluation, not just unit tests.

5. `/review`
Check factual grounding, policy alignment, missing edge cases, and operational safety for store and regional workflows.

6. `/ship`
Only ship after the evaluation harness passes or any blocked live-eval dependency is explicitly documented.

## Source-Driven Rules

- Treat Gemini, LangChain, Deep Agents, Convex, Next.js, and Vercel AI SDK behavior as source-driven. Verify current behavior from official docs before changing integrations.
- Prefer the current Google GenAI stack and Gemini 3 family guidance over legacy Gemini SDK patterns.
- When a capability is still preview-only, say so in code comments or docs near the integration point.

## Agent Quality Bar

- Prefer grounded, operationally specific answers over generic assistant prose.
- Responses should cite exact issue IDs, policy IDs, affected SKUs, dates, and thresholds when available.
- Do not invent store data, policy language, or external facts.
- Use web search only when current external facts materially improve the answer.
- For internal ops guidance, prioritize local tools and reference data over open-web search.

## Golden Dataset Policy

- The canonical evaluation set lives in [data/golden_dataset.json](/d:/VSCode%20Projects/perficient_interview/data/golden_dataset.json).
- Every agent change should be checked against the preferred-response goldens before merge.
- The judge should evaluate factual alignment, policy grounding, actionability, and required reference coverage.
- Golden examples are curated synthetic references for prototype evaluation only.

## Production Note

Before using historical resolutions or operator-written responses as production goldens, clean and curate them first:

- Remove stale or contradictory guidance.
- Deduplicate near-identical cases.
- Strip low-quality or non-compliant responses.
- Reconfirm policies, escalation paths, and thresholds against current SOPs.
- Separate retrieval corpora from judge goldens so weak historical text does not silently define success.

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->
