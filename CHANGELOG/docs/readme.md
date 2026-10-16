# README history

Surface: [README](../../README.md)

## 2026-10-15 — Name the frontend Convex connection requirement

A developer following the setup guide could set the backend Gemini key without configuring the frontend connection. The setup now names `NEXT_PUBLIC_CONVEX_URL` in `.env.local`, explains the backend-missing screen when it is absent, and places that requirement before the backend Gemini-key step.

Source evidence: [ConvexClientProvider](../../src/components/ConvexClientProvider.tsx#L8) reads the public URL and returns the configuration message when it is missing. The [package scripts](../../package.json#L6) start Convex with Next.js. This was checked against source at `66ff9bc6c6c9f6557d630221c4a84b652d6b2bd6`; no connection or installation was exercised.

Scope: the setup clarification, step numbering and this linked history only. The existing overview, interview material, demo-session qualifications, application code and configuration behavior are preserved. No environment or credential values were read or written.

Limits: source inspection does not prove a fresh install, successful startup, working deployment, provider access, model behavior or production readiness.
