# AI & Technology Intelligence Module — Architecture & Delivery Plan

Status: **Design (pre-implementation)** · Owner: Architecture · Depends on: [SYSTEM_DESIGN](./SYSTEM_DESIGN.md),
[ADR-0001](../adr/ADR-0001-core-stack.md), [ADR-0005](../adr/ADR-0005-supply-side-tracking.md) ·
Decisions recorded in **[ADR-0009](../adr/ADR-0009-ai-tech-intelligence-vertical.md)**.

> **Do not skip to code.** This document is deliverables 1–12 of the brief. Implementation (deliverable 13) proceeds module-by-module only after this design is approved, each module shipping with tests +
> docs + a green `llm-eval-harness` run where AI is involved.

---

## 0. Framing: this is a vertical, not a new platform

The repository already implements a domain-**general** trend-intelligence pipeline:
`Source → Signal → (cluster) → Trend → Entity → Score → ActionPlan → Watchlist/Alert/Notification`,
with pgvector search, a 20+ page dashboard, multi-tenancy (RLS), billing, and 16 ingestion connectors.

The "AI & Technology Intelligence Module" is an **AI/tech-domain vertical** on that pipeline. ~75% of the
requested capability exists. This design adds the **delta**, reusing every existing layer:

| Brief asks for                                              | Reuse (exists)                                                            | Build (delta)                                   |
| ----------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------- |
| Data sources + legality                                     | `Source`, `LegalityTier`, RSS registry, 16 connectors                     | +AI/tech feeds, region/category tags on sources |
| Raw news item + dedup                                       | `Signal` (`@@unique([sourceId, externalId])`)                             | `SignalAnalysis` (enriched 1:1)                 |
| Per-article AI analysis (TLDR, 9 opp. scores, action items) | `packages/ai-sdk`, scoring/action-plan prompts                            | **new per-signal analysis prompt + eval set**   |
| Companies / models / tools                                  | `Entity` (COMPANY/MODEL/REPO/TOOL/MCP_SERVER/PAPER) + snapshots           | `ModelCard` detail (GGUF/Ollama/vLLM/license)   |
| Opportunity scores w/ "why"                                 | `Score` × 10 `ScoreDimension`, rationale+confidence+evidence              | map 9 axes → 10 dims + narrative sub-scores     |
| Categories / Regions / Countries                            | — (nothing)                                                               | **`Category`, `Region`, taxonomy joins**        |
| Semantic + NL search                                        | pgvector, `search.ts`, reembed                                            | NL→filter parser                                |
| Alerts (email/push/telegram/discord/slack)                  | `Watchlist`/`Alert`/`Notification`/`AlertChannel`, Slack+Discord webhooks | Telegram + Push channels                        |
| Dashboard                                                   | 20+ pages (trends, entities, quadrant, market, funding…)                  | News feed, country map, category/region views   |

**Locked decisions (ADR-0009):**

1. **Analysis unit = per-article (Signal-level) full analysis**, with mandatory cost guardrails
   (relevance gate → model tiering → content-hash cache → dedupe-first). Trends remain as an
   aggregation layer over analyzed signals.
2. **Score axes:** reuse the existing 10 `ScoreDimension` numeric scores unchanged (no enum migration,
   no new eval gate on canonical dims). The brief's 9 opportunity axes — including Career, Learning,
   Automation, Startup, Freelancing, which have no enum home — are delivered as **narrative + sub-score
   fields inside the `SignalAnalysis` JSON payload**, not as first-class `Score` rows.

---

## 1. Architecture diagram

```
                         ┌─────────────────────── SCHEDULER (BullMQ repeatable) ───────────────────────┐
                         │  per-source cron · incremental cursors · retries/backoff · dedupe windows     │
                         └───────────────┬─────────────────────────────────────────────────────────────┘
                                         │ enqueue ingest jobs
   ┌─────────────────────────────────────▼───────────────────────────────────────────────────────────┐
   │ INGESTION LAYER  (services/ingestion-service)                                                     │
   │  connectors: rss(+AI feeds) · github · hackernews · huggingface · arxiv · producthunt · reddit …  │
   │  → validate (Zod) → upsert Source, write Signal (dedupe on sourceId+externalId)                    │
   └─────────────────────────────────────┬───────────────────────────────────────────────────────────┘
                                          │ event: signal.ingested (Redis Stream)
   ┌──────────────────────────────────────▼──────────────────────────────────────────────────────────┐
   │ NORMALIZATION LAYER  (new: packages/intel-core)                                                   │
   │  clean text · language detect · canonical URL · content hash · near-dupe (embedding cosine)       │
   └──────────────────────────────────────┬──────────────────────────────────────────────────────────┘
                                          │ relevance gate (cheap classifier): AI/tech? region? category?
                    ┌──────── no ─────────┤
                    ▼ (drop / archive)     ▼ yes
              (not analyzed)   ┌──────────────────────────────────────────────────────────────────────┐
                               │ ENRICHMENT + AI ANALYSIS LAYER  (services/ai-service)                 │
                               │  tier-1 cheap: classify(category, region, companies, TLDR)            │
                               │  tier-2 capable: 9-axis opportunity analysis + action items           │
                               │  → SignalAnalysis (JSON payload) + Score rows (10 dims) + embedding    │
                               │  cache by contentHash+promptVersion; gated by llm-eval-harness         │
                               └──────────────┬──────────────────────────────┬────────────────────────┘
                                              │                              │
                               ┌──────────────▼─────────┐        ┌───────────▼───────────────┐
                               │ EMBEDDINGS/SEARCH LAYER │        │ AGGREGATION → Trend/Entity │
                               │ pgvector + FTS + NL→qry │        │ cluster analyzed signals   │
                               └──────────────┬─────────┘        └───────────┬───────────────┘
                                              │                              │
   ┌──────────────────────────────────────────▼──────────────────────────────▼───────────────────────┐
   │ API LAYER  (services/api): tRPC (internal) + REST /api/v1 (public) — filters: country/region/     │
   │ category/company/score; NL search; feeds; alerts subscribe                                        │
   └──────────────────────────────────────────┬───────────────────────────────────────────────────────┘
                                              │
   ┌──────────────────────────────────────────▼───────────────────────────────────────────────────────┐
   │ DASHBOARD LAYER  (apps/web): News Feed · Country Map · Category/Region views · Model tracker ·     │
   │ Opportunity cards · Search · Saved searches · Bookmarks · Dark mode                               │
   └───────────────────────────────────────────────────────────────────────────────────────────────────┘
                                              │  alerts fan-out
   ┌──────────────────────────────────────────▼───────────────────────────────────────────────────────┐
   │ NOTIFICATION LAYER (services/notification-service): email · push · telegram · discord · slack      │
   └───────────────────────────────────────────────────────────────────────────────────────────────────┘
```

Clean-architecture boundaries: connectors know nothing of AI; the AI layer knows nothing of HTTP; the
dashboard consumes only the API. All model calls go through `@aioi/ai-sdk`; all DB access through
`@aioi/database`.

---

## 2. Folder structure (additions only)

```
packages/
  intel-core/                     # NEW — normalization + taxonomy + relevance (pure, testable)
    src/normalize.ts              # clean text, canonical URL, contentHash
    src/dedupe.ts                 # near-dupe via embedding cosine + shingle hash
    src/taxonomy.ts               # Category + Region registries (code-defined, seeded to DB)
    src/relevance.ts              # cheap AI/tech relevance gate (rules + tier-1 model)
services/
  ingestion-service/src/connectors/   # +ai-news feeds registered in rss.ts; +openrouter, +ollama-registry
  ai-service/src/
    analyze-signal.ts             # NEW — per-article tier-1 + tier-2 pipeline
    analyze-signal.prompt.ts      # NEW — versioned prompt (opportunity axes)
  notification-service/src/channels/
    telegram.ts  push.ts          # NEW channels
apps/web/app/
  feed/page.tsx                   # NEW — global news feed (filters)
  feed/[id]/page.tsx              # NEW — article detail + full analysis
  map/page.tsx                    # NEW — country/region heatmap
  models/page.tsx                 # NEW — open-source model tracker
.claude/skills/opportunity-scoring-engine/references/   # +signal-analysis golden set
```

No new top-level dirs beyond `packages/intel-core`; everything else extends existing services.

---

## 3. Database schema (delta)

New models + enums (Prisma; UUID PKs, `gen_random_uuid()`, global unless noted). Migration is additive
and lock-safe (new tables + nullable columns; no destructive change to `Signal`).

```prisma
enum Region { US CHINA INDIA EUROPE JAPAN SOUTH_KOREA SINGAPORE CANADA AUSTRALIA OTHER }

model Category {                       // seeded from packages/intel-core taxonomy
  id        String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  key       String  @unique            // "ai-models", "coding-ai", "video-ai", …
  name      String
  parentId  String? @db.Uuid
  parent    Category? @relation("sub", fields: [parentId], references: [id])
  children  Category[] @relation("sub")
  signals   SignalCategory[]
}

model SignalCategory {                 // many-to-many, AI-assigned + confidence
  signalId   String @db.Uuid
  categoryId String @db.Uuid
  confidence Float
  @@id([signalId, categoryId])
  @@index([categoryId])
}

/// 1:1 enrichment of a Signal — the per-article AI analysis. Kept separate from raw Signal so ingest
/// stays immutable and re-analysis is a clean rewrite. `payload` carries the brief's 9 opportunity
/// axes (incl. Career/Learning/Automation/Startup/Freelancing) as narrative + sub-score.
model SignalAnalysis {
  signalId       String   @id @db.Uuid
  region         Region
  language       String
  tldr           String                   // ≤50 words
  payload        Json                      // executiveSummary, whyItMatters, businessOpp, developerOpp,
                                           // startupOpp, investmentOpp, careerOpp, learningOpp, contentOpp,
                                           // automationOpp, freelancingOpp {score,why}, skillsToLearn,
                                           // companiesAffected, techMentioned, difficulty, industry,
                                           // estMarketImpact, actionItems, confidence, trendingScore
  impactScore    Int      @db.SmallInt     // 1–100
  opportunityScore Int    @db.SmallInt     // 1–100 (composite, mirrors Trend rubric)
  credibilityScore Int    @db.SmallInt     // source-tier + corroboration
  contentHash    String                    // cache key: dedupe + re-analysis skip
  promptVersion  String
  createdAt      DateTime @default(now())
  signal         Signal   @relation(fields: [signalId], references: [id], onDelete: Cascade)
  @@index([region, impactScore])
  @@index([opportunityScore])
}

/// Supply-side model tracking detail (extends Entity type=MODEL). Populated from HF + registries.
model ModelCard {
  entityId       String  @id @db.Uuid
  license        String?
  paramsB        Float?
  benchmarks     Json                       // {mmlu, gpqa, swe-bench, …}
  ggufAvailable  Boolean @default(false)
  ollamaTag      String?
  mlxAvailable   Boolean @default(false)
  vllmSupported  Boolean @default(false)
  transformers   Boolean @default(false)
  weightsUrl     String?
  updatedAt      DateTime @updatedAt
  entity         Entity  @relation(fields: [entityId], references: [id], onDelete: Cascade)
}
```

Changes to existing models (nullable, backfilled): `Source` gets `region Region?` and
`defaultCategoryKey String?`; `Signal` gets `embedding` reuse (already exists for search) — no
destructive change. Dedup: existing `@@unique([sourceId, externalId])` + new `contentHash` for
cross-source near-dupes.

---

## 4. API design (delta)

Internal tRPC (`services/api`) + public REST (`/api/v1`, OpenAPI). All list endpoints take the shared
filter object, validated by one Zod schema (`@aioi/validation`) consumed by RHF + tRPC + REST.

```
GET  /api/v1/news              ?region=&country=&category=&company=&minOpportunity=&sort=&cursor=
GET  /api/v1/news/{id}         → Signal + SignalAnalysis (full 9-axis payload)
GET  /api/v1/models            ?license=&paramsMin=&gguf=&sort=   (ModelCard tracker)
POST /api/v1/search            { q: "open source models released this week" }  → NL→filter + semantic
GET  /api/v1/categories        · GET /api/v1/regions
POST /api/v1/alerts            { targetType: CATEGORY|COMPANY|MODEL|REGION|KEYWORD, channel, cadence }
```

Filter schema (single source of truth):

```ts
export const newsFilter = z.object({
  region: z.nativeEnum(Region).optional(),
  category: z.string().optional(), // Category.key
  company: z.string().optional(), // Entity name
  minOpportunity: z.number().min(1).max(100).optional(),
  sort: z.enum(["recent", "opportunity", "impact", "trending"]).default("recent"),
  cursor: z.string().optional(),
});
```

Every mutating/privileged call: RBAC check + audit-log entry (existing middleware). Public reads are
rate-limited per API key (existing `ApiKey`/`ApiKeyUsage`).

---

## 5. Background job architecture

BullMQ (Redis) via existing `services/scheduler`. Queues:

| Queue       | Trigger                                                    | Job                                           | Idempotency                                |
| ----------- | ---------------------------------------------------------- | --------------------------------------------- | ------------------------------------------ |
| `ingest`    | repeatable cron per source (RSS 15m, GitHub 30m, arXiv 6h) | fetch → upsert Signals                        | cursor + `sourceId+externalId`             |
| `normalize` | on `signal.ingested`                                       | clean, hash, near-dupe, relevance gate        | `contentHash` seen-set                     |
| `analyze`   | relevant signals only                                      | tier-1 classify → tier-2 opportunity analysis | skip if `contentHash+promptVersion` cached |
| `cluster`   | after analyze batch                                        | attach signal → Trend/Entity                  | `TrendSignal` PK                           |
| `alerts`    | after analyze                                              | match watchlists → fan-out                    | `Notification` dedupe key                  |

Retries: exponential backoff (3 attempts), poison → dead-letter + audit. Incremental sync via
`IngestionRun.cursor`. Cost guardrail: `analyze` runs under a per-window budget cap; over budget →
queue defers low-impact signals to the next window.

---

## 6. AI workflow (per article)

```
Signal ─► [gate] rules + tier-1 relevance model ── not AI/tech ──► archive (no spend)
             │ relevant
             ▼
        tier-1 (cheap model): category[], region, companiesAffected[], TLDR   ─► cache
             ▼
        tier-2 (capable model): 9 opportunity axes {score,why} + executive summary +
             skills + difficulty + industry + market impact + action items      ─► cache
             ▼
        write SignalAnalysis(payload, impact/opportunity/credibility) + 10 Score rows + embedding
             ▼
        llm-eval-harness gate on the analysis prompt (faithfulness, schema-validity, cost/latency)
```

- Provider-agnostic via `@aioi/ai-sdk` (LiteLLM); tracing via Langfuse.
- **Cost controls (mandatory, per ADR-0009):** relevance gate before any tier-2 call; model tiering;
  content-hash cache (re-runs are free unless prompt version bumps); dedupe-first so near-identical
  reposts analyze once; per-window budget cap. "LLM cost per active user" tracked as a release metric.
- Prompt is versioned (`promptVersion`); no change ships without a green golden-set run.

---

## 7. News ingestion workflow

1. Scheduler enqueues `ingest` per enabled `Source` on its cron.
2. Connector fetches from cursor, validates each item (Zod), upserts `Source`, writes new `Signal`s
   (dedupe on `sourceId+externalId`), records an `IngestionRun`.
3. Emits `signal.ingested`. Failures are counted, never crash a run (existing RSS pattern).
4. Normalizer canonicalizes, hashes, near-dupe-checks (cross-source), applies the relevance gate.
5. Relevant signals flow to `analyze`; irrelevant are archived (kept for audit, not analyzed).

Sources (all `LegalityTier=OFFICIAL` unless licensed): the 20 existing RSS feeds + additions — OpenAI,
Anthropic, Google AI/DeepMind, Microsoft/Meta/AWS/Azure AI, NVIDIA, Hugging Face, TechCrunch/Verge/
VentureBeat/MIT Tech Review AI feeds, arXiv, Papers with Code, Product Hunt, HN, Reddit AI subs (API),
GitHub Trending/Releases. **No ToS-violating scraping** (X/LinkedIn/Google Trends excluded per repo rule).

---

## 8. Opportunity scoring algorithm

Canonical numeric scores stay the existing composite (`services/ai-service/src/scoring.ts`,
`OPPORTUNITY_WEIGHTS`): business .25, monetization .15, seo .15, developer .10, creator .10,
competition .10⁻¹, risk .10⁻¹, difficulty .05⁻¹ → 0–100 opportunity. Applied per Signal (and rolled up
per Trend).

The brief's **9 axes** are delivered in `SignalAnalysis.payload`, each `{ score: 1–100, why: string,
evidence: [...] }`, mapped:

| Brief axis                                   | Backed by                                        |
| -------------------------------------------- | ------------------------------------------------ |
| Business                                     | `Score BUSINESS`                                 |
| Developer                                    | `Score DEVELOPER`                                |
| Investment                                   | `Score MONETIZATION`                             |
| Content                                      | `Score CREATOR` + `SEO`                          |
| Startup                                      | composite(business, competition⁻¹, difficulty⁻¹) |
| Career / Learning / Automation / Freelancing | narrative sub-scores (LLM, in payload)           |

Every axis carries a **rationale + confidence + evidence** (non-negotiable per the scoring-engine skill).
No score change ships without a golden-set regression case.

---

## 9. Search architecture

- **Semantic:** pgvector cosine over `Signal.embedding` (existing infra + reembed job).
- **Lexical:** Postgres FTS on title/summary.
- **Hybrid rank:** reciprocal-rank-fusion of the two, filtered by taxonomy (region/category/company).
- **NL query:** `POST /api/v1/search` → tier-1 model parses "open source models released this week" into
  `{ category:"ai-models", openSource:true, after:<date> }` + a semantic vector; deterministic filters
  applied in SQL, semantic used for ranking. Grounded, faithfulness-gated (RAG skill rules).

---

## 10. Dashboard UI design

New pages in `apps/web` (RSC-first, `@aioi/ui` tokens, dark mode already global):

- **News Feed** (`/feed`): filterable card stream — region/country, category, company, min-opportunity,
  sort. Each card: TLDR, category chips, region flag, opportunity/impact badges, bookmark.
- **Article detail** (`/feed/[id]`): full 9-axis analysis, companies/tech, action items, source link.
- **Country map** (`/map`): choropleth heatmap of signal volume × avg opportunity by region.
- **Model tracker** (`/models`): `ModelCard` table — license, params, benchmarks, GGUF/Ollama/vLLM/MLX
  badges, sortable.
- Cross-cutting: saved searches, bookmarks, category/region filter rail — reuse existing table/chart/
  filter components (TanStack Table, Recharts). Accessibility (WCAG 2.2 AA) checked on every UI change.

---

## 11. Implementation roadmap (modules)

Each module is independently shippable, with tests + docs + (where AI) a green eval, before the next.

| #         | Module                   | Delivers                                                                               | Gate                               |
| --------- | ------------------------ | -------------------------------------------------------------------------------------- | ---------------------------------- |
| **M1** ✅ | Taxonomy + schema        | `Category`, `Region`, `SignalCategory`, `SignalAnalysis`, `ModelCard` migration + seed | migration lock-safe; DB tests      |
| **M2** ✅ | `packages/intel-core`    | normalize, dedupe, taxonomy, relevance gate                                            | unit tests, no network             |
| **M3** ✅ | AI feed expansion        | +AI/tech RSS + region/category on `Source`                                             | connector tests (MSW)              |
| **M4** ✅ | Per-article analysis     | `analyze-signal` tier-1/tier-2, cost guardrails                                        | **llm-eval-harness golden set**    |
| **M5** ✅ | Search + NL query        | hybrid rank + NL→filter                                                                | eval: parse accuracy, faithfulness |
| **M6** ✅ | API + filters            | `/api/v1/news`, `/models`, `/search`, `/categories`                                    | contract tests, RBAC, rate-limit   |
| **M7** ✅ | Dashboard                | feed, article, map, model tracker                                                      | a11y + RTL + Playwright            |
| **M8**    | Alerts                   | Telegram + Push channels; region/category/model targets                                | integration tests                  |
| **M9**    | Model tracker enrichment | GGUF/Ollama/vLLM/benchmarks from HF + registries                                       | connector tests                    |

Cross-cutting each module: Conventional Commit, changeset, CHANGELOG, ADR if a decision arises,
feature-branch → PR → development.

---

## 12. Step-by-step development plan (M1 first)

1. **ADR-0009** (this design's decisions) — commit alongside this doc.
2. **M1:** add models to `schema.prisma`; `prisma migrate dev`; seed `Category`/`Region` from
   `intel-core/taxonomy`; RLS review (intelligence core is global, tenant surfaces already isolated);
   repository methods in `@aioi/database` + tests. → PR.
3. **M2:** `packages/intel-core` pure functions + unit tests. → PR.
4. **M3:** register AI feeds; tag sources; MSW connector tests. → PR.
5. **M4:** `analyze-signal` + versioned prompt + golden set; wire `analyze` queue with budget cap;
   verify cost telemetry. → PR (eval must be green).
6. …M5–M9 in order, each its own PR with the gate above.

Implementation of **deliverable 13 begins at step 2 (M1) only after this design + ADR-0009 are approved.**

```

---

### Assumptions / open items
- Regions modeled as a fixed enum (9 + OTHER); country granularity handled via a `country` string on
  `SignalAnalysis` if finer than region is later needed.
- Push channel = web push (PWA) for v1; native mobile is out of scope per project scope.
- Telegram/Discord/Slack use per-org webhooks (Slack/Discord config already exists in `OrgIntegration`).
```
