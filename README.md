# FloorAI — Retail Operations Intelligence

> Floor-level AI for store and regional operations management.
> Built for the Perficient AI Prototype Challenge.

**Live:** [getfloorai.vercel.app](https://getfloorai.vercel.app)
**Stack:** Next.js 15 · Convex · Gemini 3.1 Pro · Google Search Grounding · Inter

---

## Table of Contents

1. [What This Is](#what-this-is)
2. [How It Was Built — Session Transcript](#session-transcript)
3. [Prompt Evolution](#prompt-evolution)
4. [Recommended Starting Prompt](#recommended-starting-prompt)
5. [Architecture](#architecture)
6. [Agent Design](#agent-design)
7. [Evaluation Framework](#evaluation-framework)
8. [Key Design Decisions & Tradeoffs](#key-design-decisions--tradeoffs)
9. [Real User Scenarios](#real-user-scenarios)
10. [Interview Walkthrough Guide](#interview-walkthrough-guide)
11. [New Developer Guide](#new-developer-guide)
12. [Future Work](#future-work)

---

## What This Is

FloorAI is a prototype operations control layer for retail grocery chains (think Trader Joe's / Walmart Neighborhood Market). It serves two personas:

- **Store Managers** see their store's issues, get AI-powered resolution guidance grounded in company policy, and track action items.
- **Regional Managers** see all stores, detect cross-store patterns, triage escalations, and coordinate follow-up across the region.

The AI agent uses Gemini 3.1 Pro with function calling to query internal databases (issues, inventory, policies, staffing) and Google Search for external context, then delivers structured, policy-backed responses with quality gates.

---

## Session Transcript

This project was built in a single Claude Code session. Below are the key prompts (paraphrased from the session), in order, showing how the project evolved from zero to deployed product.

### Phase 1: Planning (Prompt 1-3)

**Prompt 1** — The user shared the Perficient AI Prototype Challenge brief and chose the "Retail: Store Operations Assistant" scenario. They specified the tech stack (Convex, Google Gemini, agent SDK), two UI personas (store manager, regional manager), and asked for a plan with synthetic data.

> "DIRECTION: We are going with the Scenarios for Retail: Store Operations Assistant, spin up a prototype at the end, plan for now... generate synthetic dataset (ie CSV file of 20 test cases)... give me your recommendations as well but make sure to explain why"

**Prompt 2** — Asked to set up the project with all dependencies and explain the synthetic data architecture with ASCII diagrams.

> "Set up pgvector, google gemini, agent sdk, UI... key to set up in convex env... dogfood after UI is ready... explain how we are setting up the synthetic data, explain with ASCII diagrams"

**Prompt 3** — Stack pivot: move from `@google/generative-ai` to `@convex-dev/agent` + `@ai-sdk/google`, use `gemini-3-flash` or newer, add Google Search grounding, reference LangChain Deep Agents architecture.

### Phase 2: Build & Iterate (Prompts 4-8)

**Prompt 4** — "do what you need and let's start dogfood locally as both the store manager and the regional manager in parallel" — Full deployment to Convex cloud, database seeding, Next.js startup, and live browser verification of both UIs.

**Prompt 5** — Fix markdown rendering, trace UX, source handling, and streaming. "how do we fix it root cause wise, and how can we do streaming delta display rather than just waiting" — Led to the durable streaming architecture with `messageEvents` table.

**Prompt 6** — "address model-quality work" — Added structured Convex retrieval layer (`briefs.ts`), deterministic answer path for high-confidence cases, coverage gates, runtime quality checks.

**Prompt 7** — "regarding both single issue and broader multi-issue synthesis quality; how do we address from root cause" — Full agent architecture documentation, evidence contracts, typed worker outputs, runtime validation.

**Prompt 8** — "implement fully end to end" — Answer packets, persisted eval runs, quality-gated streaming, audit trail.

### Phase 3: Review & Polish (Prompts 9-14)

**Prompt 9** — Comprehensive code review identifying P0/P1/P2 issues across error recovery, type safety, quality check accuracy, streaming race conditions, doc-vs-code gaps.

**Prompt 10** — "Finish it all and deploy so I can share the url to my interviewer" — Fixed P0s (word-boundary regex, access guards, escapeForRegex helper), deployed to Vercel, set up `getfloorai.vercel.app` alias.

**Prompt 11** — "I want new inspiration for even more modern compact minimal user mental model" — UI redesign discussion. User chose Linear + Slack hybrid layout.

**Prompt 12** — Full page rewrites: removed warm glass-panel aesthetic, added Linear sidebar, underline tabs, compact metrics, two-column layout with issues left / chat right.

**Prompt 13** — "implement and make sure works like Linear+Slack" — Issue threading (click issue -> dedicated chat thread), sidebar store switching via URL params, daily brief greeting, per-issue persistent sessions.

**Prompt 14** — "how does every feature we verified so far truthfully cater to all real world scenarios" — Honest assessment of gaps. Led to implementing 9 additional features: shift-aware greeting, sidebar store filtering, mobile responsive, SLA timers, escalation queue, pattern alerts, action-issue linking, past resolution surfacing, vendor contacts.

### Phase 4: Ship (Prompts 15-17)

**Prompt 15** — GitHub repo creation, group chat feature, deploy verification.

**Prompt 16** — "does that mean that we can have group chat as different people" — Built standalone GroupChat component with shared session, sender attribution, avatar initials.

**Prompt 17** — "the groupchatpanel should be completely separated... write down the exact prompt... write a final recommended coding agent prompt" — This README.

---

## Prompt Evolution

The prompts evolved through four distinct phases:

```
Phase 1: PLAN         "Here's the challenge, here's the stack, plan it"
  |                    Result: PLAN.md, synthetic data, architecture decisions
  v
Phase 2: BUILD        "Set it up, dogfood, fix root causes"
  |                    Result: Working prototype, streaming, quality gates
  v
Phase 3: REVIEW       "Does this actually work for real users?"
  |                    Result: 9 additional features, honest gap analysis
  v
Phase 4: SHIP         "Deploy, share URL, write docs"
                       Result: Vercel + GitHub + README
```

**What went well:**
- Giving the full challenge brief upfront with stack preferences saved multiple rounds of clarification
- "Fix it root cause wise" forced architectural solutions instead of patches
- "How does every feature truthfully cater to real world scenarios" produced the most valuable output — the honest gap analysis that drove 9 features

**What went poorly:**
- The initial UI was over-designed (warm glass panels, paper textures) and had to be completely rewritten
- Multiple deploy key format issues wasted time
- ChatPanel was designed as a fixed sidebar, making it impossible to reuse for group chat — had to build GroupChat from scratch
- Not specifying "Linear + Slack layout" from the start led to 3 UI rewrites

---

## Recommended Starting Prompt

If starting this project over, this single prompt would have produced a better result faster:

```
I'm building a prototype for a retail operations AI assistant interview challenge.

CONTEXT:
- Interview is [date]. Need a shareable deployed URL.
- Scenario: Regional retail manager needs fast answers when issues arise across
  multiple store locations. Takes a question/issue, pulls internal policies and
  historical data, provides actionable guidance.

STACK DECISIONS (non-negotiable):
- Convex for real-time DB (subscriptions, file storage, vector search)
- Google Gemini 3.1 Pro for the agent (function calling + Google Search grounding)
- @convex-dev/agent for agent orchestration
- Next.js 15 App Router for frontend
- Deploy to Vercel + Convex cloud

UI REQUIREMENTS:
- Linear-style layout: fixed left sidebar (220px) with nav + store list
- Two views: Store Manager (single-store) and Regional Manager (multi-store)
- Issues displayed as Linear-style list rows, sorted by severity
- AI chat as a Slack-style right panel with issue threading
  (click an issue -> dedicated chat thread for that issue)
- Separate /chat page with centered Slack-style group chat
- Mobile responsive with hamburger menu
- Inter font, flat white/gray, indigo accents, no decorative effects

AGENT REQUIREMENTS:
- 4 tools: searchIssues, lookupInventory, lookupPolicy, searchPastResolutions
- Google Search grounding for external context
- Deterministic answer path for single tracked issues (no LLM needed)
- Fallback to Gemini synthesis for complex/multi-issue queries
- Every response must reference specific IDs (ISS-001, POL-INV-003, SKU-4411)
- Quality gates: check primary issue ref, governing policy ref, action steps,
  cross-store patterns, revenue impact
- Durable streaming via messageEvents table (not blocking wait)

DATA:
- Create synthetic dataset: 20 issues across 8 stores, 18 company policies,
  40 inventory items, staffing records
- Golden evaluation dataset: 20 test queries with preferred responses and
  required references for automated scoring
- Eval harness that runs the live agent (not mocked) and scores with LLM judge

REAL-WORLD FEATURES:
- Operator session system with role-based access control
- SLA timers on issues (4h critical, 24h high, 72h medium)
- Cross-store pattern detection (auto-alert when 3+ stores report same issue type)
- Escalation queue with Accept/Delegate workflow
- Shift-aware daily greeting using live staffing data
- Action item tracking with issue-resolution linking

DEPLOYMENT:
- Vercel for frontend, Convex cloud for backend
- GitHub repo with comprehensive README
- Shareable URL for interviewer

Build everything, deploy, verify in browser, then write the README.
```

This prompt encodes all the lessons learned across 17 iterations into a single starting point.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Next.js 15 Frontend                   │
│                                                          │
│  /              Home (operator session picker)           │
│  /store         Store Manager (Linear issue list + chat) │
│  /regional      Regional Manager (multi-store + chat)    │
│  /chat          Group Chat (Slack-style shared channel)  │
│                                                          │
│  Components: Sidebar, IssueCard, ChatPanel, GroupChat,   │
│              ActionItemsPanel, IssueComposer             │
└───────────────────────┬──────────────────────────────────┘
                        │ Convex React hooks
                        │ (useQuery, useMutation, useAction)
┌───────────────────────┴──────────────────────────────────┐
│                    Convex Backend                        │
│                                                          │
│  Schema: users, stores, issues, inventory, policies,     │
│          staffing, resolutions, messages, messageEvents,  │
│          actionItems, files, answerPackets, evalRuns,     │
│          evalCases, eventLogs                            │
│                                                          │
│  Modules: agent.ts (2000+ lines)                        │
│           briefs.ts (scoped evidence retrieval)          │
│           eval.ts (golden dataset evaluation)            │
│           access.ts (role-based access control)          │
│           + 12 domain modules                           │
│                                                          │
│  Agent Component: @convex-dev/agent (thread management)  │
└───────────────────────┬──────────────────────────────────┘
                        │ REST API
┌───────────────────────┴──────────────────────────────────┐
│              Google Gemini 3.1 Pro Preview               │
│                                                          │
│  Function calling: 8 tools                              │
│  Google Search grounding: external context              │
│  Structured output: JSON plans                          │
└──────────────────────────────────────────────────────────┘
```

---

## Agent Design

### Execution Pipeline

```
User query
    │
    ▼
1. SETUP: Load operator profile, enforce access, load recent messages
    │
    ▼
2. EVIDENCE: getAgentBrief() — ranked issues, policies, inventory, staffing
    │
    ▼
3. PLAN: Gemini Flash Lite generates JSON execution plan (6+ tool steps)
    │
    ▼
4. EXECUTE: Loop up to 5 turns of Gemini function calling
    │   ├── searchIssues → issues table
    │   ├── lookupInventory → inventory table
    │   ├── lookupPolicy → policies table (full-text search)
    │   ├── searchPastResolutions → resolutions table
    │   ├── getStoreMetrics → operations module
    │   ├── getRegionalSummary → operations module
    │   ├── createActionItem → actionItems table
    │   ├── createIssue → issues table
    │   └── googleSearch → external grounding
    │
    ▼
5. SYNTHESIZE: Deterministic path (single issue + policy) OR Gemini fallback
    │
    ▼
6. QUALITY: 6 automated checks (primary issue, policy, action steps,
    │         revenue impact, cross-store pattern, unsupported refs)
    │
    ▼
7. PERSIST: answerPacket + audit event + stream to UI via messageEvents
```

### Deterministic vs Fallback Path

```
IF single matched issue
   AND governing policy found
   AND no external search needed
THEN → Deterministic answer (template-rendered, no LLM)
       Sections: What / Policy / Actions / Escalation / Revenue

ELSE → Gemini synthesis (temperature 0.3, brief as context)
       Coverage check → regenerate if key refs missing
```

### Streaming Architecture

```
agent.ts                    messages table              ChatPanel
    │                            │                          │
    ├── createDraftAssistant ──► │ status: "streaming"     │
    │                            │                      ◄── useQuery subscribes
    ├── appendStreamEvent ─────► messageEvents table       │
    │   (plan.created,           │                      ◄── useQuery subscribes
    │    step.started,           │                          │
    │    step.finished,          │                          │ renders:
    │    sources.updated)        │                          │  - live text
    │                            │                          │  - trace steps
    ├── syncDraft(appendText) ──►│ content grows           │  - sources
    │   (80-char chunks, 18ms)   │                      ◄── │  - quality badge
    │                            │                          │
    ├── syncDraft(completed) ───►│ status: "completed"     │
    │                            │                          │
    └── persistAnswerPacket      answerPackets table        │
```

---

## Evaluation Framework

### Golden Dataset

20 test cases in `data/golden_dataset.json`. Each case has:

```json
{
  "id": "EVAL-001",
  "scenario": "Store manager asks about organic milk delivery issue",
  "role": "store_manager",
  "storeId": "STR-101",
  "query": "What's happening with our milk delivery?",
  "required_references": ["ISS-001", "SKU-4411", "DairyFresh Co", "POL-INV-003"],
  "preferred_response": "ISS-001: Horizon Organic 64oz (SKU-4411)...",
  "criteria": {
    "must_mention_issue_id": true,
    "must_reference_policy": true,
    "must_provide_action_steps": true,
    "must_mention_cross_store_pattern": true,
    "must_mention_revenue_impact": true
  }
}
```

### Two-Layer Scoring

```
AUTOMATED (deterministic, fast):
  - String match: required_references present in response
  - Regex: ISS-\d{3}, POL-[A-Z]+-\d{3}, numbered action steps
  - Result: refScore (0-100%)

LLM JUDGE (semantic, Gemini 3.1 Pro):
  - Compares actual vs golden preferred response
  - Scores 1-5: accuracy, actionability, policy_compliance,
                 completeness, groundedness
  - Persisted in evalCases table
```

### Latest Results (3-case sample)

| Metric | Score |
|--------|-------|
| Reference Score | 100% |
| Accuracy | 4.7/5 |
| Actionability | 5.0/5 |
| Completeness | 4.7/5 |
| Groundedness | 4.7/5 |
| Policy Compliance | 4.7/5 |

### Running Evals

```bash
# Run 3-case smoke test
npx convex run eval:runEval '{"limit":3}'

# Run full 20-case suite
npx convex run eval:runEval
```

---

## Key Design Decisions & Tradeoffs

### Why Convex (not Postgres/Supabase)?

**Decision:** Real-time subscriptions. When a store manager files an issue, the regional manager's dashboard updates instantly — no polling, no WebSocket setup, no cache invalidation.

**Tradeoff:** Convex is less flexible for complex SQL queries. We compensate with in-memory filtering in query handlers, which works at prototype scale (< 100 records) but wouldn't scale to 10K+ without indexes and pagination.

**Reference:** [Convex real-time docs](https://docs.convex.dev/realtime)

### Why Gemini 3.1 Pro (not GPT-4o or Claude)?

**Decision:** Native Google Search grounding. In a single agent turn, Gemini can call both internal tools (searchIssues, lookupPolicy) AND search the web for supplier news, regulatory updates — no separate search API needed.

**Tradeoff:** Gemini 3 Pro was deprecated March 9, 2026. We use 3.1 Pro Preview which is newer but still "Preview." Model quality for multi-issue synthesis is weaker than single-issue queries.

**Reference:** [Gemini models page](https://ai.google.dev/gemini-api/docs/models)

### Why Deterministic Answers (not always LLM)?

**Decision:** For single tracked issues with a clear governing policy, we skip the LLM entirely and render a template-based answer. This guarantees the correct policy is cited, action steps match the policy document, and no hallucinated details are added.

**Tradeoff:** Template answers feel less natural. But for safety-critical operations (cooler failure at 52°F, customer slip-and-fall), accuracy > naturalness.

### Why Durable Streaming (not SSE)?

**Decision:** Stream via Convex mutations (messageEvents table) instead of Server-Sent Events. If the client disconnects and reconnects, they get the full conversation state from the database — no lost messages.

**Tradeoff:** Higher mutation volume (each text chunk is a mutation). At scale, this needs batching or coarser chunk sizes.

**Reference:** [Convex streaming guidance](https://docs.convex.dev/agents/streaming)

### Why Cloudflare R2 for Production File Storage (not S3)?

**Decision:** $0 egress fees. Retail generates high read traffic (managers downloading photos, compliance docs across 10+ stores). S3 egress at $0.09/GB is a silent cost multiplier.

**Tradeoff:** R2 is newer with fewer features (no S3 Select, limited lifecycle policies). For a file-upload use case, this doesn't matter.

**Reference:** [R2 vs S3 comparison](https://www.cloudflare.com/pg-r2-comparison/)

---

## Real User Scenarios

### Store Manager: Maria Chen (STR-101 Greenfield Plaza)

| Scenario | What She Does | What the System Does |
|----------|--------------|---------------------|
| Opens app at 6 AM | Sees daily greeting with staffing (9 scheduled, 8 showed, 1 no-show) + 3 low stock items | ChatPanel queries `staffing.getLatestByStore` + `inventory.getLowStock` |
| Notices milk shelf empty | Clicks ISS-001 -> Thread opens | Chat scopes to ISS-001, suggests "What's the current status?" |
| Asks "What should I do?" | Agent returns: policy POL-INV-003 steps, DairyFresh vendor contact, $480 revenue impact, cross-store flag (Elm St affected too) | Agent calls searchIssues + lookupPolicy + lookupInventory |
| Takes photo of empty shelf | Uploads via "Attach evidence" | File stored in Convex, linked to session |
| Marks action item complete | "Follow up with DairyFresh" -> Mark complete -> "All actions for ISS-001 complete. Resolve?" | ActionItemsPanel checks remaining items for same issueId |

### Regional Manager: Sandra Williams (REG-NE, 8 stores)

| Scenario | What She Does | What the System Does |
|----------|--------------|---------------------|
| Opens regional dashboard | Sees pattern alerts: "3 stores reporting inventory_gap", 19 open / 3 critical / 8 escalated / $70.8K risk | PatternAlertBanner groups issues by type + SKU |
| Clicks "Queue (8)" tab | Sees 8 escalated issues with Accept/Delegate buttons | Filtered to `escalatedToRegional === true` |
| Accepts ISS-004 (cooler failure) | Clicks Accept -> issue moves to "in_progress" | `updateIssueStatus` mutation + audit event |
| Delegates ISS-003 (staffing) | Clicks Delegate -> types "Contact StaffNow agency" -> Confirm | Updates issue with delegation notes |
| Opens group chat | `/chat` -> "# general" -> Asks "Which stores need help today?" | All operators see the same conversation in real-time |

---

## Interview Walkthrough Guide

### Opening (2 min)
"This is FloorAI — an AI-powered operations control layer for retail. It's built for store managers and regional managers who need instant, policy-grounded guidance when issues arise."

### Demo Flow (10 min)

1. **Home page** — Show operator session picker. "Access is role-scoped. Maria Chen sees only her store. Sandra Williams sees all 8."

2. **Store view as Maria Chen** — Show issue list with SLA timers ("47h overdue"). Click ISS-001 to open a thread. Show the issue-specific chat suggestions.

3. **Ask the agent** — "What's happening with our milk delivery?" Wait for streaming response. Point out: issue ID, policy reference, action steps, cross-store pattern flag, revenue impact.

4. **Switch to Sandra Williams** — Regional dashboard. Show pattern alert banners. Show Queue tab with Accept/Delegate. Show hot stores cards.

5. **Group chat** — Open `/chat`. Show the shared channel. "Any operator can join. The AI assistant is in the room."

### Technical Discussion Points (5 min)

- **"Why not just a chatbot?"** — "Chat is one surface. The real value is the issue-threaded conversation with persistent sessions, quality-gated responses, and the eval harness that measures whether the agent actually helps."

- **"How do you know the agent is accurate?"** — Show the eval framework. "20 golden test cases with required references. Automated scoring plus LLM judge. 4.7/5 accuracy on the sample run."

- **"What would you change for production?"** — "Three things: (1) Replace localStorage auth with real auth (Clerk/Auth0). (2) Add push notifications for critical SLA breaches. (3) Run the 20-case eval as a CI gate on every agent prompt change."

---

## New Developer Guide

### Getting Started

```bash
git clone https://github.com/HomenShum/floorai.git
cd floorai
npm install
npx convex dev                    # starts Convex backend (needs auth)
npm run dev                       # starts Next.js on localhost:3000
npx convex run seed:seedAll       # seeds 20 issues, 8 stores, 18 policies
```

### Project Structure

```
convex/
├── agent.ts          # 2000-line agent: plan -> execute -> synthesize -> quality
├── briefs.ts         # Evidence retrieval with weighted ranking
├── eval.ts           # Golden dataset evaluation harness
├── access.ts         # Role-based access control (4 functions)
├── schema.ts         # 16 tables with indexes
├── seed.ts           # Synthetic data seeder
├── messages.ts       # Message CRUD + streaming mutations
├── answerPackets.ts  # Quality-checked answer persistence
├── issues.ts         # Issue CRUD + search
├── policies.ts       # Policy search (full-text)
├── inventory.ts      # Store inventory queries
├── operations.ts     # Store/regional metrics
├── actionItems.ts    # Action item tracking
├── staffing.ts       # Staffing data
├── stores.ts         # Store lookups
└── users.ts          # Operator profiles

src/
├── app/
│   ├── page.tsx          # Home (operator picker)
│   ├── store/page.tsx    # Store manager workspace
│   ├── regional/page.tsx # Regional manager workspace
│   ├── chat/page.tsx     # Group chat
│   └── layout.tsx        # Root layout with Sidebar
├── components/
│   ├── ChatPanel.tsx     # AI assistant sidebar (1000+ lines)
│   ├── GroupChat.tsx      # Standalone group chat
│   ├── IssueCard.tsx      # Issue display with SLA timers
│   ├── Sidebar.tsx        # Linear-style navigation
│   ├── ActionItemsPanel.tsx
│   ├── IssueComposer.tsx
│   └── ...
└── lib/
    └── fileUploads.ts    # File upload orchestration
```

### Key Files to Understand

1. **`convex/agent.ts`** — The brain. Start at the `chat` action (line ~1320). Follow: args validation -> brief retrieval -> planner -> execution loop -> synthesis -> quality report -> answer packet.

2. **`convex/briefs.ts`** — How evidence is scoped. `getAgentBrief()` ranks issues/policies/inventory by relevance to the query using weighted token matching.

3. **`convex/eval.ts`** — `runEval` action. Runs the actual agent, scores responses against golden dataset, persists results.

4. **`src/components/ChatPanel.tsx`** — The operator rail. Handles: session management, issue threading, streaming display, metadata rendering, file upload.

5. **`convex/access.ts`** — 4 functions: `requireOperator`, `requireStoreAccess`, `requireRegionAccess`, `requireIssueAccess`. Every query checks these.

### Environment Variables

```bash
# Convex
CONVEX_DEPLOYMENT=dev:spotted-panda-291
NEXT_PUBLIC_CONVEX_URL=https://spotted-panda-291.convex.cloud

# Gemini (set in Convex env, not .env.local)
npx convex env set GOOGLE_API_KEY <your-key>
```

---

## Future Work

- **@ mentions** — Tag operators in group chat with autocomplete
- **Threaded replies** — Slack-style threads within the group chat
- **User presence** — Online/offline indicators in the sidebar
- **Push notifications** — Critical SLA breaches via service worker
- **Mobile-native layout** — Phone-optimized issue filing with camera-first workflow
- **Comparative analytics** — Bar charts, trend lines, week-over-week store comparison
- **Multi-agent decomposition** — Typed worker agents for issue ranking, policy grounding, cross-store detection, financial rollup (documented in INTERVIEW_WALKTHROUGH.md)
- **CI eval gate** — Run 20-case eval on every agent prompt change, block deploy on regression

---

## License

MIT

---

*Built by Homen Shum with Claude Code — April 2026*
