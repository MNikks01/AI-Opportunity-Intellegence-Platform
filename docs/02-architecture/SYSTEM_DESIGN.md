# System Design (HLD + LLD)

**Phase 15 · Status: complete · Last updated: 2026-07-03**
**Traces to:** [TRD](../01-product/TECHNICAL_REQUIREMENTS_DOCUMENT.md) · [DB](../04-data/DATABASE_DESIGN.md) · [API](../05-api/API_DESIGN.md)

## 1. High-Level Design (component view)
```mermaid
flowchart LR
  subgraph Client
    Web[apps/web Next.js]
    Ext[Browser Extension]
    Mkt[apps/marketing]
  end
  subgraph Edge
    CF[Cloudflare CDN/WAF]
  end
  subgraph Services
    API[services/api\nFastify + tRPC + REST]
    AI[services/ai-service\nscoring + RAG + action plans]
    ING[services/ingestion-service\nsource workers]
    SCH[services/scheduler\ncron + repeatable jobs]
    NOTIF[services/notification-service\nalerts + briefs + webhooks]
  end
  subgraph Data
    PG[(PostgreSQL + pgvector)]
    REDIS[(Redis: cache/queues/streams)]
    R2[(Cloudflare R2 objects)]
  end
  subgraph External
    LLM[LiteLLM -> OpenAI/Anthropic/Gemini/OpenRouter]
    SRC[Data sources: GitHub/HN/PH/Reddit/ArXiv/HF/...]
    STRIPE[Stripe]
    CLERK[Clerk]
  end

  Web & Ext & Mkt --> CF --> API
  API --> PG
  API --> REDIS
  API <---> AI
  API --> CLERK
  API --> STRIPE
  SCH --> REDIS
  ING --> SRC
  ING --> PG
  ING -- signal.ingested --> REDIS
  REDIS -- events --> AI
  AI --> LLM
  AI --> PG
  AI -- trend.updated --> REDIS
  REDIS -- events --> NOTIF
  NOTIF --> PG
  NOTIF --> R2
  NOTIF --> External
```
- **Sync plane:** clients → Cloudflare → `services/api` (tRPC internal, REST public) → Postgres/Redis.
- **Async plane:** `scheduler` → `ingestion-service` → event `signal.ingested` → `ai-service`
  (scores/RAG/action plans) → event `trend.updated` → `notification-service` (alerts/briefs/webhooks).
- `packages/ai-sdk` is the only path to LLMs (LiteLLM + Langfuse). `packages/database` owns Prisma.

## 2. Key sequence — signal → trend → scorecard → alert
```mermaid
sequenceDiagram
  participant SCH as Scheduler
  participant ING as Ingestion
  participant SRC as Source API
  participant DB as Postgres
  participant BUS as Redis Streams
  participant AI as AI Service
  participant LLM as LiteLLM
  participant NT as Notification

  SCH->>ING: enqueue fetch(source, cursor)
  ING->>SRC: GET (rate-limited, backoff)
  SRC-->>ING: raw items
  ING->>ING: Zod validate + normalize
  ING->>DB: upsert Signal (dedupe sourceId+externalId)
  ING->>BUS: emit signal.ingested
  BUS->>AI: consume signal.ingested
  AI->>DB: cluster into Trend (embeddings + heuristics)
  AI->>AI: check score cache (trend, rubricVersion)
  alt cache miss or material change
    AI->>LLM: score dims + generate action plan (structured JSON)
    LLM-->>AI: scores + rationale + evidence
    AI->>AI: llm-eval smoke gate (schema/faithfulness)
    AI->>DB: persist Score(s) + ActionPlan + Embedding
  end
  AI->>BUS: emit trend.updated
  BUS->>NT: consume trend.updated
  NT->>DB: match against Watchlist/Alert rules
  NT->>External: deliver (email/Slack/Discord/Telegram/webhook)
```

## 3. Low-Level Design notes
- **Clustering:** new signal → embed → nearest-trend search (pgvector cosine, threshold) + rule
  heuristics (shared entities/urls/time window). Below threshold → new `Trend(status=EARLY)`.
  ≥2 corroborating signals → `ACTIVE`; decay → `FADING/ARCHIVED` via scheduled recompute.
- **Scoring:** `opportunity-scoring-engine` contract; per-dimension prompt via `ai-sdk`; composite
  computed from sub-scores (weights in rubric); cached by `(trendId, dimension, rubricVersion)`;
  regenerate only on material signal change or rubric bump → controls LLM cost.
- **Cost controls:** draft with cheaper model, finalize with stronger; batch; cache; compress
  tool/RAG context (evaluate `headroom-ai`); per-request cost tag in Langfuse; org-level cost caps.
- **Idempotency & ordering:** consumer groups on Redis Streams; at-least-once + idempotent upserts;
  dedupe keys everywhere; poison messages quarantined + alerted (no worker crash-loop).
- **Realtime:** `notification-service`/`api` push WebSocket updates on `trend.updated`/`alert.fired`.
- **RAG search:** query → embed → pgvector kNN → rerank → answer with cited context; faithfulness
  gated by `llm-eval-harness`.
- **Multi-region readiness:** stateless services scale horizontally; Postgres primary + read replicas;
  Redis for shared state; objects in R2 (global). Region strategy documented in SCALABILITY_PLAN.

## 4. Failure modes & resilience
| Failure | Behavior |
|---|---|
| Source down / 429 | backoff+jitter; trend freshness → "stale" badge; no cascade |
| LLM provider down | LiteLLM fallback to alternate provider; scoring queue retries |
| Eval gate fails on deploy | block release (CI); last-good prompts stay live |
| Scoring backlog | queue-backed, autoscale workers, prioritize watched trends |
| Postgres failover | read replicas serve reads; writes retry; health/readiness gates traffic |

## 5. Review checklist
- [x] HLD shows sync + async planes and every service/datastore.
- [x] End-to-end sequence covers ingestion → scoring (with eval gate + cache) → notification.
- [x] Clustering, scoring cost controls, idempotency, RAG, realtime specified.
- [x] Failure modes have defined, non-cascading behaviors.
- [x] Consistent with DB (score cache key, dedupe) and API (single service layer).
