# Interview Walkthrough

## What This Project Is

This is a production-style retail operations assistant for store managers and regional managers.

It is built to answer operational questions with:

- current issue data
- company policy references
- historical resolutions
- uploaded evidence such as documents, photos, and videos
- tracked follow-up action items

The core goal is not to ship a generic chat UI. The goal is to give operators one workspace where they can:

- see live operational risk
- file and escalate issues
- upload evidence
- ask grounded questions
- create and complete action items
- inspect audit activity

## Product Scope

There are two primary workspaces:

1. `Store mode`
   - used by one store manager
   - focused on a single location
   - supports issue intake, evidence upload, staffing and metrics review, grounded chat, and tracked execution

2. `Regional mode`
   - used by a regional manager
   - focused on cross-store triage
   - surfaces pattern watch, regional queue, store risk scan, action items, and regional assistant support

## Architecture

### Frontend

- Next.js App Router
- React 19
- Convex React client for live queries, mutations, and actions

Key pages:

- [src/app/page.tsx](/d:/VSCode%20Projects/perficient_interview/src/app/page.tsx:1)
- [src/app/store/page.tsx](/d:/VSCode%20Projects/perficient_interview/src/app/store/page.tsx:1)
- [src/app/regional/page.tsx](/d:/VSCode%20Projects/perficient_interview/src/app/regional/page.tsx:1)

Key product components:

- [src/components/IssueComposer.tsx](/d:/VSCode%20Projects/perficient_interview/src/components/IssueComposer.tsx:1)
- [src/components/IssueCard.tsx](/d:/VSCode%20Projects/perficient_interview/src/components/IssueCard.tsx:1)
- [src/components/ChatPanel.tsx](/d:/VSCode%20Projects/perficient_interview/src/components/ChatPanel.tsx:1)
- [src/components/ActionItemsPanel.tsx](/d:/VSCode%20Projects/perficient_interview/src/components/ActionItemsPanel.tsx:1)
- [src/components/RecentActivityPanel.tsx](/d:/VSCode%20Projects/perficient_interview/src/components/RecentActivityPanel.tsx:1)
- [src/components/AttachmentList.tsx](/d:/VSCode%20Projects/perficient_interview/src/components/AttachmentList.tsx:1)

### Backend

- Convex for data, live subscriptions, mutations, and server actions
- Gemini `gemini-3.1-pro-preview`
- Gemini built-in `googleSearch`
- internal Convex tools for issues, operations, files, action items, inventory, policies, and resolutions

Key backend files:

- [convex/schema.ts](/d:/VSCode%20Projects/perficient_interview/convex/schema.ts:1)
- [convex/agent.ts](/d:/VSCode%20Projects/perficient_interview/convex/agent.ts:1)
- [convex/issues.ts](/d:/VSCode%20Projects/perficient_interview/convex/issues.ts:1)
- [convex/actionItems.ts](/d:/VSCode%20Projects/perficient_interview/convex/actionItems.ts:1)
- [convex/files.ts](/d:/VSCode%20Projects/perficient_interview/convex/files.ts:1)
- [convex/operations.ts](/d:/VSCode%20Projects/perficient_interview/convex/operations.ts:1)
- [convex/staffing.ts](/d:/VSCode%20Projects/perficient_interview/convex/staffing.ts:1)
- [convex/audit.ts](/d:/VSCode%20Projects/perficient_interview/convex/audit.ts:1)
- [convex/access.ts](/d:/VSCode%20Projects/perficient_interview/convex/access.ts:1)

## Data Model

The Convex schema now includes the operational entities needed for a production-style workflow:

- `users`
- `stores`
- `issues`
- `inventory`
- `policies`
- `staffing`
- `resolutions`
- `actionItems`
- `files`
- `messages`
- `messageEvents`
- `answerPackets`
- `evalRuns`
- `evalCases`
- `eventLogs`

Why that matters:

- `issues` track the problem record
- `files` support evidence-based workflows
- `actionItems` convert recommendations into owned work
- `answerPackets` persist the grounded answer artifact plus its quality result
- `evalRuns` and `evalCases` turn evaluation into durable Convex state
- `eventLogs` create an audit trail
- `users` allow role and scope enforcement

## Agent Pipeline

The assistant is implemented in [convex/agent.ts](/d:/VSCode%20Projects/perficient_interview/convex/agent.ts:1).

The flow is:

1. Validate operator scope
2. Load recent session history
3. Load attached files and inline supported evidence
4. Call Gemini with:
   - system instruction
   - built-in `googleSearch`
   - Convex-backed function tools
5. Execute model tool calls against Convex
6. Loop until Gemini returns a final answer
7. Fall back to a deterministic synthesis path if Gemini returns no final text
8. Persist assistant message, references, sources, and metadata
9. Record audit activity for success or failure

Implemented tool surface:

- `search_issues`
- `search_policies`
- `lookup_inventory`
- `search_past_resolutions`
- `get_store_metrics`
- `get_regional_summary`
- `create_action_item`
- `create_issue`

### Evidence Handling

Files are uploaded through Convex storage and linked into either an issue or a chat session.

Current behavior:

- images under 4 MB can be inlined to Gemini
- PDFs under 4 MB can be inlined to Gemini
- small text and JSON files are extracted and sent as text context
- larger files and videos are stored and linked but not yet deeply analyzed inline

This gives the product a real multimodal foundation without pretending that every asset is automatically fully interpreted.

## Access Control

This build uses an operator-session model rather than a full identity provider.

Current implementation:

- home page lets the demo user pick a seeded operator
- the operator session is persisted locally
- backend functions enforce scope using the `users` table
- store managers can access only their assigned stores
- regional managers can access only their assigned regions
- direct navigation to the wrong workspace is blocked

Relevant files:

- [src/components/OperatorSessionProvider.tsx](/d:/VSCode%20Projects/perficient_interview/src/components/OperatorSessionProvider.tsx:1)
- [convex/access.ts](/d:/VSCode%20Projects/perficient_interview/convex/access.ts:1)
- [convex/users.ts](/d:/VSCode%20Projects/perficient_interview/convex/users.ts:1)

Important interview note:

This is authorization and session simulation, not enterprise authentication. In a real production rollout, the next step would be replacing the demo operator picker with real auth and identity mapping.

## Audit And Observability

Every major state-changing workflow now records an audit event:

- issue creation
- issue status changes
- escalations
- file upload and removal
- staffing updates
- action item creation and completion
- assistant success and failure

The UI exposes recent activity through:

- [src/components/RecentActivityPanel.tsx](/d:/VSCode%20Projects/perficient_interview/src/components/RecentActivityPanel.tsx:1)

This matters because operators and reviewers need to see what changed, who triggered it, and when.

## Evaluation Story

There are two evaluation layers in the repo.

### Golden dataset and judge flow

- [data/golden_dataset.json](/d:/VSCode%20Projects/perficient_interview/data/golden_dataset.json:1)
- [data/synthetic_preferred_responses.json](/d:/VSCode%20Projects/perficient_interview/data/synthetic_preferred_responses.json:1)

These represent preferred operational responses used as a golden reference set.

### Live Convex eval path

- [convex/eval.ts](/d:/VSCode%20Projects/perficient_interview/convex/eval.ts:1)

This calls the same live `agent:chat` path and then judges the result against:

- required references
- expected criteria
- LLM-judge rubric scores
- persisted `evalRuns` and `evalCases` records in Convex

That is important because product and evaluation are now aligned on the same assistant runtime.

### Current quality snapshot

After the latest Convex-side quality hardening pass, the live eval path on the first 3 golden cases is:

- `avgAccuracy: 4.7/5`
- `avgActionability: 4.7/5`
- `avgCompleteness: 4.7/5`
- `avgGroundedness: 4.7/5`
- `avgPolicyCompliance: 4.3/5`
- `avgReferenceScore: 100%`

That result matters because it came from the live `agent:chat` runtime, not a separate offline harness, and the run is now persisted in Convex for later inspection.

## Quality Root Causes

The model-quality problem breaks into two different failure classes.

### Single-issue failures

Root cause:

- the model was previously writing from broad retrieval summaries instead of a canonical issue packet
- adjacent issue context, historical resolutions, and regional data could leak into a store-level answer
- policy references were present, but policy execution details were not tightly bound to the final response
- the model was allowed to infer missing operational details instead of being forced to restate tracked facts

This causes the classic failure pattern:

- correct issue ID
- correct policy ID
- wrong thresholds, wrong escalation framing, or extra unrelated details

### Multi-issue synthesis failures

Root cause:

- regional questions require aggregation, ranking, contradiction handling, and narrative synthesis across multiple issues
- naive summarization collapses evidence too early
- the system can lose which facts came from which issue, store, policy, or action item
- one strong issue can dominate the response while weaker but still relevant issues disappear

This causes the regional failure pattern:

- good references
- weak prioritization
- vague “full picture” answer
- incomplete cross-store narrative
- inconsistent next-step sequencing

## What Was Already Changed

The current codebase now addresses part of this directly.

- [convex/briefs.ts](/d:/VSCode%20Projects/perficient_interview/convex/briefs.ts:1) builds a structured Convex brief for the current query and scope
- [convex/agent.ts](/d:/VSCode%20Projects/perficient_interview/convex/agent.ts:1) uses that brief during planning and synthesis
- tracked internal issue questions now have a deterministic response path instead of always relying on freeform synthesis
- coverage checks force regeneration when the answer omits the primary issue, primary policy, revenue impact, or required pattern signal
- completed answers now persist an `answerPacket` in Convex with quality status, quality checks, answer text, brief, and trace
- live evals now persist `evalRuns` and `evalCases` in Convex instead of existing only as CLI output
- live eval in [convex/eval.ts](/d:/VSCode%20Projects/perficient_interview/convex/eval.ts:1) now judges the actual answer text instead of the full `{ answer, trace }` envelope

This is the right direction because it shifts the problem from "prompt harder" to "improve evidence contracts."

## Production Pattern Alignment

The latest public agent systems are converging on a similar architecture, even when their user experience differs.

### Claude Code style patterns

Public Claude Code docs currently emphasize:

- layered project memory via `CLAUDE.md`
- scoped instructions that load by directory
- hooks around tool execution
- explicit subagent lifecycle events

What that means for this project:

- keep project instructions and quality rules explicit and scoped
- treat validation as runtime enforcement, not as passive documentation
- use pre/post execution gates for policy-sensitive tool calls and answer completion

### Hermes Agent style patterns

Hermes’ public multi-agent docs describe:

- hierarchical task decomposition
- structured message passing between orchestrator and workers
- parallel execution with concurrency limits
- orchestrator-owned synthesis instead of workers summarizing each other

What that means for this project:

- regional synthesis should not be one monolithic model prompt
- it should fan out into typed workers such as `issue_ranker`, `policy_grounder`, `cross_store_detector`, and `action_planner`
- the final answer should synthesize raw typed outputs, not summaries-of-summaries

### OpenClaw style patterns

OpenClaw’s public runtime docs emphasize:

- session-to-session coordination
- persistent session history
- reusable skills
- explicit runtime and control-plane separation

What that means for this project:

- keep durable event logs, trace packets, and answer artifacts in Convex
- separate discovery, execution, and synthesis concerns
- make reusable operational workflows first-class instead of burying them in one giant agent prompt

### DeepFlow style patterns

The public DeepFlow repository describes:

- multi-step agent architecture
- specialized agents
- memory/state tracking
- tool validation and typed tool systems

What that means for this project:

- the retail assistant should behave more like a typed workflow runtime than a generic chatbot
- every step should have a typed input, typed output, and explicit purpose
- tool results should be promoted into structured evidence objects before synthesis

## Recommended Production Architecture

The correct production answer is not “one smarter prompt.”

It is a layered runtime with different quality paths for different classes of work.

### Path A: single tracked operational issue

Use this when:

- the request maps cleanly to one primary issue
- one governing policy is clear
- the answer is mostly procedural

Recommended pattern:

1. Build canonical issue packet from Convex.
2. Bind primary policy packet.
3. Pull only tightly related inventory, staffing, and cross-store evidence.
4. Render deterministic answer sections:
   - what is happening
   - what policy says
   - immediate actions
   - escalation state
   - revenue impact
5. Use the model only for phrasing cleanup if needed.
6. Validate final answer against hard requirements before returning it.

This is now partially implemented.

### Path B: broader multi-issue synthesis

Use this when:

- the user asks for a summary, full picture, trend, comparison, or prioritization
- multiple stores or issue families are relevant

Recommended pattern:

1. Planner creates a typed execution graph.
2. Parallel workers gather:
   - issue ranking
   - policy grounding
   - cross-store links
   - financial impact rollup
   - action queue state
3. Each worker returns typed output objects, not prose.
4. Aggregator resolves conflicts and builds a prioritized evidence graph.
5. Synthesis model writes from the graph.
6. Post-answer validator checks:
   - top issues included
   - priority order is explicit
   - policy-backed next actions exist
   - no unsupported IDs or thresholds were introduced

This is the biggest remaining production-quality gap.

## Convex Implementation Plan

Convex is the right place to formalize this because it already owns state, subscriptions, tool execution, and eval.

### Implemented now

1. Added a first-class `answerPackets` model in Convex.
   - stores canonical structured evidence for each answer
   - separates evidence from rendered prose

2. Added `evalRuns` and `evalCases` tables.
   - persist live quality runs
   - track regression history over time
   - make runtime quality reviewable after the fact

3. Added `qualityChecks` to the agent runtime.
   - required issue ID present
   - required policy ID present
   - required action steps present
   - no extra unsupported references

### Next production additions

1. Add typed worker functions for multi-issue synthesis.
   - `rankIssuesForQuestion`
   - `groundPoliciesForIssues`
   - `detectCrossStorePatterns`
   - `rollupFinancialImpact`
   - `buildActionPlan`

2. Add confidence scoring.
   - high confidence -> deterministic response path
   - medium confidence -> model synthesis with validator
   - low confidence -> assistant responds with narrowed scope and follow-up question

### Medium-term additions

1. Convert broad regional answers to orchestrator-worker execution.
2. Persist an evidence graph in Convex so the UI can show exactly why an issue was prioritized.
3. Add answer-level policy hooks before completion.
4. Add eval-driven deployment thresholds in CI.

## Why This Matches Modern Agent Practice

Across Claude Code, Hermes, OpenClaw, and similar systems, the most important shift is the same:

- memory is scoped
- tools are gated
- workers are specialized
- synthesis happens over structured outputs
- quality is enforced by runtime checks, not just prompts

That is exactly how this project should evolve if the goal is true production quality instead of a polished demo.

### Production recommendation

For a real rollout, I would not directly promote all existing historical references into judge goldens.

I would:

1. clean the historical reference set
2. deduplicate and normalize policy mappings
3. remove weak or inconsistent operator answers
4. promote only high-confidence cases into the gold set
5. keep a separate held-out evaluation set from the live retrieval corpus

## UI Decisions

The UI was intentionally rebuilt away from a generic chatbot look.

Design principles used:

- evidence-first layout
- explicit operating metrics
- risk surfaced before chat
- execution queue visible alongside recommendations
- regional and store views visually distinct but consistent

The product is designed so an interviewer can immediately understand:

- who the user is
- what scope they are operating in
- what is broken
- what requires action now
- what the assistant is adding

## Demo Script

### Store manager flow

1. Open `/`
2. Select `Maria Chen`
3. Enter `Store mode`
4. Show the risk spotlight and issue board
5. Point out evidence-backed issue creation
6. Ask the assistant: `What issues need my attention right now?`
7. Show returned issue IDs, policy references, and audit event

### Regional manager flow

1. Return home
2. Select `Sandra Williams`
3. Enter `Regional mode`
4. Show pattern watch and store risk scan
5. Show the escalated queue and action items
6. Show that `/store` is blocked for the regional session

## Verification Completed

Code verification:

- `npm exec tsc -- --noEmit`
- `npm exec convex -- dev --once`
- `npm exec convex -- run seed:seedAll`

Browser verification:

- home page loads cleanly
- store workspace loads for a store manager
- regional workspace loads for a regional manager
- wrong-role direct navigation is blocked
- live store chat completed successfully
- audit event appeared after the assistant response
- browser console is clean

## Remaining Production Gaps

This is now a strong interview-grade prototype, but a few real production items are still intentionally out of scope:

- real auth provider integration
- stronger background processing for large video and PDF analysis
- full orchestrator-worker path for broader multi-issue synthesis
- deploy gating on top of the persisted eval history
- more robust ranking and retrieval over policies and historical resolutions
- formal SLOs, retries, and monitoring around external model latency
- stronger dataset governance for evaluation goldens

## Short Positioning Summary

If asked what makes this more than a demo, the answer is:

- it has role-scoped access control
- it treats files as first-class evidence
- it converts recommendations into tracked actions
- it persists citations and audit data
- it evaluates against a golden dataset
- it uses the same live agent path for product behavior and judging

That combination is the core production narrative.

## External References

These architecture recommendations are informed by current public agent-system references as of April 14, 2026:

- Claude Code hooks: https://code.claude.com/docs/en/hooks
- Claude Code subagents: https://code.claude.com/docs/en/sub-agents
- Claude Code memory model: https://code.claude.com/docs/en/memory
- Hermes overview and persistent memory/skills model: https://hermes-agent.nousresearch.com/
- Hermes bundled skills catalog: https://hermes-agent.nousresearch.com/docs/reference/skills-catalog/
- OpenClaw gateway runtime: https://docs.openclaw.ai/index
- OpenClaw session tools: https://docs.openclaw.ai/concepts/session-tool
- OpenClaw session state model: https://docs.openclaw.ai/concepts/session
- DeepFlow multi-step agent architecture: https://github.com/DeepFlowcc/DeepFlow

## ASCII Walkthrough Appendix

This appendix gives an interview-friendly ASCII view of the current system and the next production-quality direction.

### A.1 The 9 layers in this repo

```text
LAYER                    WHAT IT DOES                              WHERE IT LIVES
-----                    ------------                              --------------

1. FRONTEND              Store + regional workspaces,              src/app/
   (Next.js UI)          intake, issue cards, operator rail,       src/components/
                         audit feed, evidence upload               src/lib/fileUploads.ts

2. SESSION / ACCESS      Demo operator session + scope gates       src/components/OperatorSessionProvider.tsx
   (identity boundary)   route protection + backend auth checks    convex/access.ts
                                                                    convex/users.ts

3. CONVEX DATA           Canonical app state: issues, files,       convex/schema.ts
   (system of record)    staffing, policies, action items,         convex/issues.ts
                         messages, events, audit                    convex/files.ts
                                                                    convex/actionItems.ts
                                                                    convex/audit.ts

4. RETRIEVAL / BRIEF     Builds scoped evidence packet for         convex/briefs.ts
   (evidence shaping)    the current question:
                         primary issue, policy, inventory,
                         staffing, cross-store links

5. AGENT ORCHESTRATION   Plans tool usage, executes tool loop,     convex/agent.ts
   (planner + executor)  records trace, streams status and text

6. DETERMINISTIC         High-confidence internal issue path:      convex/agent.ts
   ISSUE RENDERER        tracked issue + governing policy ->
                         direct answer packet / constrained prose

7. MODEL SYNTHESIS       Gemini for planning, external grounding,  convex/agent.ts
   (LLM layer)           fallback synthesis, and broader answers   convex/eval.ts

8. EVALUATION / QA       Golden set checks, reference scoring,     convex/eval.ts
   (quality gates)       LLM judge, criteria pass/fail             data/golden_dataset.json

9. OBSERVABILITY         Draft message events, tool trace,         convex/messages.ts
   (what happened?)      telemetry, audit events, source trace     src/components/ChatPanel.tsx
                                                                    src/components/RecentActivityPanel.tsx
```

### A.2 Current shape vs next production shape

```text
QUESTION: "What's happening with our milk delivery?"

CURRENT SHAPE (implemented now)                  NEXT SHAPE (production target)
--------------------------------                 --------------------------------
1. Build Convex brief                            1. Build Convex brief
2. Plan tool calls                               2. Classify question type:
3. Execute tools                                    - single tracked issue
4. If high-confidence internal issue:               - multi-issue synthesis
   deterministic answer path                        - external-current-facts
5. Else synthesize with Gemini                   3. Route to specialized path
6. Coverage gate / fallback                      4. Run typed workers when needed
7. Stream draft + trace to UI                    5. Build answer packet
                                                 6. Validate answer packet
Current strengths:                               7. Render final answer
  - strong single-issue grounding                8. Persist eval + quality results
  - live trace and event stream
  - deterministic policy rendering               Target strengths:
                                                   - stronger regional "full picture"
Current weakness:                                  - less cross-issue drift
  - broader multi-issue synthesis still            - deploy-gated quality checks
    too monolithic                                 - explicit confidence routing
```

### A.3 How a single tracked issue flows today

```text
USER: "We're short-staffed today, 3 people called out. What should I do?"

   Layer 1  FRONTEND         User asks from the store workspace or operator rail.
      |                      ChatPanel creates the user message and opens the
      |                      live message + messageEvents subscription.
      v
   Layer 2  SESSION          Operator session says:
      |                      - operatorId = OP-STR-103
      |                      - store scope = STR-103
      |                      Backend access checks enforce that scope.
      v
   Layer 3  CONVEX DATA      The runtime can now safely access:
      |                      - issues for STR-103
      |                      - staffing rows for STR-103
      |                      - policies table
      |                      - files attached to this session
      v
   Layer 4  BRIEF            briefs:getAgentBrief(query, storeId) returns:
      |                      - primary issue: ISS-003
      |                      - governing policy: POL-HR-007
      |                      - latest staffing snapshot
      |                      - any directly related evidence
      v
   Layer 5  AGENT            agent:chat plans and executes the run:
      |                      - writes run.started
      |                      - writes plan.created
      |                      - calls internal tools if needed
      |                      - records step.started / step.completed
      v
   Layer 6  DETERMINISTIC    Because this is a tracked internal staffing issue
      |                      with a clear governing policy, the runtime prefers:
      |                      - issue packet
      |                      - parsed policy steps
      |                      - exact revenue impact
      |                      - exact escalation state
      |                      This is the root-cause fix for single-issue quality.
      v
   Layer 7  MODEL            Gemini is still available for planning and fallback,
      |                      but it is no longer trusted to invent the operating
      |                      details for a high-confidence internal issue.
      v
   Layer 8  EVAL             The same answer path is judged against:
      |                      - required references
      |                      - must_provide_action_steps
      |                      - must_reference_policy
      |                      - groundedness / policy compliance
      v
   Layer 9  OBSERVABILITY    The UI shows:
                             - streaming status
                             - planned steps
                             - executed steps
                             - telemetry
                             - final grounded answer
                             - audit event in the activity feed
```

### A.4 How broader multi-issue synthesis should work next

```text
USER: "I'm seeing multiple stores report DairyFresh delivery issues. What's the full picture?"

CURRENT STATE
-------------
One planner + one synthesis pass can still over-compress the evidence.
That creates the last major quality gap:
  - one issue dominates
  - some related stores disappear
  - policy framing can get vague

TARGET STATE
------------

   PHASE 1: PLAN
     planner produces a typed graph:
       s1 = rank_issues_for_question
       s2 = ground_policies_for_ranked_issues
       s3 = detect_cross_store_pattern
       s4 = rollup_financial_impact
       s5 = build_action_plan
       s6 = synthesize_regional_answer

   PHASE 2: EXECUTE
     s1 -> returns prioritized issue list
     s2 -> returns governing policy packets
     s3 -> returns store-to-store linkage graph
     s4 -> returns revenue + risk rollup
     s5 -> returns action queue by urgency

   PHASE 3: SYNTHESIZE
     final model reads typed worker outputs, not raw tables, and writes:
       - full picture
       - top stores / top issues
       - governing policy
       - immediate actions
       - cross-store pattern
       - financial impact

   PHASE 4: VALIDATE
     quality checks reject the answer if:
       - top ranked issue missing
       - cross-store pattern not explicit
       - unsupported IDs introduced
       - action order not clear
```

### A.5 Why this is the root-cause fix

```text
BAD PATTERN
-----------
raw retrieval -> giant prompt -> model prose

Why it fails:
  - context pollution
  - weak issue ownership
  - policies treated as text, not rules
  - cross-store evidence collapses too early

BETTER PATTERN
--------------
scoped evidence -> typed brief -> route by confidence
                 -> deterministic issue path OR typed worker graph
                 -> validation -> final prose

Why it works:
  - single-issue answers become rule-bound
  - multi-issue answers become aggregation-bound
  - quality gates are runtime checks, not prompt hopes
  - Convex becomes the durable control plane for state, trace, and eval
```

### A.6 Interview soundbite

```text
"The model-quality problem was not mainly a prompting problem.
It was an evidence-contract problem.

For single tracked incidents, we fixed it by moving to canonical Convex issue
packets plus deterministic policy rendering.

For broader regional synthesis, the next production step is not a bigger prompt;
it is a typed orchestrator-worker graph with answer validation before release."
```

### A.7 Streaming + answer packet flow

```text
USER PROMPT
   ->
agent:chat action starts
   ->
messages.createDraftAssistant
   ->
messageEvents.append:
   - run.started
   - plan.created
   - step.started / step.completed
   - sources.updated
   - synthesis.started / synthesis.completed
   - quality.checked
   - answer.packet.created
   - run.completed
   ->
answerPackets.create
   - answer text
   - references
   - sources
   - quality status
   - quality checks
   - brief snapshot
   - trace snapshot
   ->
messages.updateAssistantDraft(metadata = trace + quality + answerPacketId)
   ->
ChatPanel renders:
   - streamed answer text
   - clickable sources
   - quality checks
   - planned steps
   - executed steps
   - telemetry
```
