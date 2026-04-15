# Retail: Store Operations Assistant — Architecture Plan

## Situation
Regional retail managers (think Walmart district manager overseeing 8-15 stores, or Trader Joe's "Captain" managing a cluster) face a daily firehose: inventory gaps, staffing no-shows, equipment failures, compliance violations, and customer escalations. Today they rely on phone trees, email chains, and tribal knowledge. Resolution time is slow, context is scattered, and the same problems recur because historical solutions aren't captured.

## Two User Personas

### 1. Store Manager (single-store view)
- Sees only their store's issues, inventory, staffing
- Can file new issues, query policies, search past resolutions
- Gets AI-suggested actions based on their store's context

### 2. Regional Manager (multi-store view)
- Sees all assigned stores in a dashboard
- Cross-store pattern detection (e.g., "3 stores reporting same vendor delay")
- Escalation routing, priority triage, aggregate analytics

---

## Tech Stack Decisions

### Database: Convex
**Why:** Real-time subscriptions mean when a store manager files an issue, the regional manager's dashboard updates instantly — no polling, no refresh. Convex also gives us a single backend (DB + serverless functions + file storage) which is ideal for prototype speed.
- Ref: https://docs.convex.dev/realtime

### LLM: Google Gemini (gemini-2.0-flash or gemini-2.5-pro)
**Why:** Native function calling / tool use, generous free tier for prototype, multimodal (can process uploaded photos of damaged goods, planograms, etc.), and the Gemini API supports structured output which is critical for reliable tool calls.
- Ref: https://ai.google.dev/gemini-api/docs/function-calling
- Ref: https://ai.google.dev/gemini-api/docs/structured-output

### Vector Search: Convex built-in vector search
**Why:** Convex has native vector search (no Pinecone/Weaviate needed). We embed historical resolutions and policy documents, store vectors directly in Convex, and query them with cosine similarity. One less service to manage.
- Ref: https://docs.convex.dev/search/vector-search

### File Storage: Cloudflare R2 (recommended) or Convex File Storage (prototype)
See detailed comparison below.

---

## File Storage Decision

| Criteria | Convex File Storage | AWS S3 | Cloudflare R2 |
|---|---|---|---|
| Egress cost | Included in Convex plan | $0.09/GB (adds up fast for images/PDFs) | **$0 egress** |
| S3-compatible API | No (proprietary) | Yes (native) | Yes |
| CDN integration | Via Convex URLs | CloudFront (extra config) | Built-in (Cloudflare network) |
| Prototype speed | **Fastest** (zero config) | Medium (IAM, buckets, CORS) | Fast (simple dashboard) |
| Production scale | Limited (tied to Convex pricing) | Enterprise standard | **Best cost/performance** |
| Gemini file upload | N/A (use Gemini Files API separately) | N/A | N/A |

### Recommendation
- **Prototype:** Use Convex File Storage — zero additional infra, files are queryable alongside your data, and URLs are generated automatically.
  - Ref: https://docs.convex.dev/file-storage
- **Production:** Migrate to Cloudflare R2 — $0 egress fees is the killer feature for retail where store managers will be uploading/downloading photos, PDFs, and compliance docs constantly. S3's egress costs compound fast across 10+ stores with multiple daily uploads.
  - Ref: https://developers.cloudflare.com/r2/
  - Ref: https://www.cloudflare.com/pg-r2-comparison/ (R2 vs S3 cost comparison)

**Why NOT S3 for this use case:** Retail operations generate high read traffic (every manager checking every issue = image/doc downloads). S3 egress at $0.09/GB is a silent cost multiplier. R2 eliminates this entirely while maintaining S3-compatible APIs, so migration is trivial (swap endpoint URL, done).

**Why NOT Gemini Files API as primary storage:** Gemini's File API (https://ai.google.dev/gemini-api/docs/files) is designed for temporary context injection into prompts, not persistent file management. Files expire after 48 hours. Use it as a processing layer (upload → analyze → discard), but store originals in R2/Convex.

---

## Architecture Diagram (text)

```
┌─────────────────────────────────────────────────┐
│                   Frontend (Next.js)             │
│  ┌──────────────┐    ┌────────────────────────┐  │
│  │ Store Mgr UI │    │ Regional Mgr Dashboard │  │
│  │ (single store)│    │ (multi-store overview) │  │
│  └──────┬───────┘    └──────────┬─────────────┘  │
│         │                       │                 │
│         └───────────┬───────────┘                 │
│                     │                             │
│              Convex Client SDK                    │
│              (real-time subscriptions)            │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────┐
│              Convex Backend                      │
│  ┌────────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ Relational │ │ Vector   │ │ File Storage  │  │
│  │ Tables     │ │ Index    │ │ (prototype)   │  │
│  │ (inventory,│ │ (policy  │ │ → R2 in prod  │  │
│  │  staffing, │ │  docs,   │ │               │  │
│  │  issues)   │ │  past    │ │               │  │
│  │            │ │  fixes)  │ │               │  │
│  └────────────┘ └──────────┘ └───────────────┘  │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │ Convex Actions (serverless functions)    │    │
│  │  → Gemini API calls (tool use)           │    │
│  │  → Inventory lookup tool                 │    │
│  │  → Policy search tool (vector)           │    │
│  │  → Historical resolution tool (vector)   │    │
│  │  → Cross-store pattern detection         │    │
│  └──────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
                      │
              ┌───────┴────────┐
              │ Google Gemini  │
              │ (function      │
              │  calling)      │
              └────────────────┘
```

## Gemini Tool Definitions (what the agent can call)

1. **lookup_inventory(store_id, product_sku?)** → Returns current stock levels, reorder status, last delivery date
2. **search_policies(query)** → Vector search over company policies, returns relevant excerpts
3. **search_past_resolutions(issue_description)** → Vector search over historical resolved issues, returns similar cases + what worked
4. **get_store_metrics(store_id)** → Staffing levels, sales data, open issues count
5. **get_regional_summary(region_id)** → Aggregate view across all stores
6. **create_action_item(store_id, description, assignee, priority)** → Creates a tracked follow-up

---

## Data Model (Convex Tables)

```
stores: { store_id, name, address, region_id, manager_name }
issues: { issue_id, store_id, type, description, severity, status, created_at, resolved_at, resolution_notes }
inventory: { store_id, sku, product_name, category, current_stock, reorder_point, last_delivery, supplier }
staffing: { store_id, date, scheduled_count, actual_count, no_show_count, overtime_hours }
policies: { policy_id, title, content, category, effective_date, embedding (vector) }
resolutions: { resolution_id, issue_id, description, actions_taken, outcome, embedding (vector) }
files: { file_id, issue_id, filename, storage_id, uploaded_by, uploaded_at }
```

---

## Slide Plan (STAR Format, 1-3 slides)

### Slide 1: The Problem & Solution
- **Situation**: Regional managers juggle 8-15 stores. Issues come via calls, texts, emails. No single source of truth.
- **Task**: Build an AI assistant that gives instant, context-aware guidance by pulling inventory data, company policies, and historical resolutions.
- **Action**: Built a real-time prototype with Convex + Gemini. Two UIs: store-level (file issues, get guidance) and regional (cross-store triage, pattern detection).
- **Result**: Store managers get AI-suggested resolutions in seconds instead of waiting for callbacks. Regional managers see cross-store patterns instantly.

### Slide 2 (if needed): Architecture
- Visual of the tech stack + data flow

### Slide 3 (if needed): Demo walkthrough
- Screenshot of both UIs with annotations
