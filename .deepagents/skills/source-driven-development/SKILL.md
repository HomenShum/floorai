---
name: source-driven-development
description: Use this skill for framework or SDK integration work involving Gemini, LangChain, Deep Agents, Convex, Next.js, or evaluation infrastructure so implementation decisions stay grounded in current official docs instead of stale examples.
license: MIT
metadata:
  author: perficient_interview
  inspired_by: addyosmani/agent-skills source-driven-development
  version: "1.0"
---

# Source-Driven Development

## Overview

This skill enforces source-backed implementation for fast-moving AI frameworks and SDKs. Use it whenever a task touches Gemini model capabilities, tool calling, Deep Agents skills, or evaluation behavior.

## Instructions

1. Verify the current behavior in official documentation before changing integration code.
2. Prefer current GA SDKs and current model names over legacy or deprecated paths.
3. If a capability is preview-only, preserve that caveat in the code comments or surrounding documentation.
4. When examples online conflict, prefer:
   - Official product docs
   - Official SDK docs
   - Official SDK repository README
5. Do not copy old snippets blindly. Normalize them to the current SDK surface used by this repo.

## Applied Here

- Gemini model selection must use the latest supported model IDs verified from Google docs.
- LangChain Google integration must preserve Gemini 3 thought-signature behavior.
- Deep Agents skills should be loaded from the local filesystem using the official skill format.
