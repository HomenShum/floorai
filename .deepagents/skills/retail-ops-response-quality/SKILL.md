---
name: retail-ops-response-quality
description: Use this skill for store-manager and regional-manager guidance so answers stay operationally specific, policy-grounded, and escalation-aware.
license: MIT
metadata:
  author: perficient_interview
  inspired_by: addyosmani/agent-skills incremental-implementation
  version: "1.0"
---

# Retail Ops Response Quality

## Overview

This skill defines what a good operational response looks like in this project.

## Instructions

1. Start with the highest-risk issue first.
2. Quote the relevant issue IDs, policy IDs, SKUs, dates, and thresholds.
3. Separate immediate actions from follow-up actions.
4. For store-manager prompts:
   - focus on what they can do now
   - call out when regional approval is required
5. For regional-manager prompts:
   - call out cross-store patterns
   - prioritize systemic fixes over isolated symptoms
6. Do not recommend unsupported actions that violate policy.
7. When external current events matter, use Google Search. Otherwise prefer local tools.
