---
name: golden-dataset-evaluation
description: Use this skill when changing prompts, tools, models, or agent orchestration so the resulting behavior is evaluated against the synthetic preferred-response golden dataset before sign-off.
license: MIT
metadata:
  author: perficient_interview
  inspired_by: addyosmani/agent-skills test-driven-development
  version: "1.0"
---

# Golden Dataset Evaluation

## Overview

This skill treats preferred responses as the proof layer for agent quality. Agent changes are incomplete until they have been evaluated against the curated synthetic goldens.

## Instructions

1. Load the golden dataset from `data/synthetic_preferred_responses.json`.
2. For each case, compare the agent response against:
   - The preferred response
   - The required references in `must_include`
   - The expected issue and policy IDs
3. Score on four axes:
   - factual alignment
   - policy grounding
   - actionability
   - required-reference coverage
4. Fail any case that omits a critical policy or cites the wrong issue or escalation path.
5. Save machine-readable results for later regression checks.

## Production Guardrail

Synthetic goldens are acceptable for prototype evaluation.
For production, historical operator responses must be cleaned, deduplicated, and policy-validated before they become judge references.
