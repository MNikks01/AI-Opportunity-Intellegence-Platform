# ARCHITECTURE (summary)

Full design: [System Design (HLD/LLD)](../docs/02-architecture/SYSTEM_DESIGN.md) ·
[DB Design](../docs/04-data/DATABASE_DESIGN.md) · [API Design](../docs/05-api/API_DESIGN.md) ·
[Infrastructure](../docs/06-infra/INFRASTRUCTURE.md).

## Style

Modular monolith-of-services in a monorepo, event-driven at the seams. Scale the hot paths
(ingestion, AI) independently; not micro-everything on day one.

## Planes

- **Sync:** `apps/web` ⇄ `services/api` (tRPC internal, REST public) → Postgres/Redis.
- **Async:** `scheduler` → `ingestion-service` → `signal.ingested` → `ai-service` (score/RAG/action)
  → `trend.updated` → `notification-service` (alerts/briefs/webhooks).
- **Bus:** Redis Streams / BullMQ (MVP) behind a thin interface → swappable to NATS/SQS.

## Data model (core)

`Signal → Trend → Score(×10, versioned by rubric) → ActionPlan`; `Entity` (company/model/repo/…);
tenant surfaces (Workspace/Watchlist/Alert/Brief/Report/ApiKey/AuditLog). Global intelligence vs
tenant data separated; tenant rows scoped by `organizationId` + Postgres RLS.

## AI subsystem

`@aioi/ai-sdk` (LiteLLM + Langfuse) is the only path to models. Scoring per
`opportunity-scoring-engine` (rubric + strict JSON schema, composite computed from sub-scores,
cached by `(trendId, dimension, rubricVersion)`). Every prompt/model change gated by
`llm-eval-harness`.

## Cross-cutting

Multi-tenancy (RLS + app guard) · RBAC on every route · Zod validation at boundaries · idempotent
ingestion/webhooks · append-only audit log · OTel traces + Langfuse LLM traces · health/readiness
per service.

## Key sequence

See the ingestion→scoring→notification sequence diagram in
[SYSTEM_DESIGN.md](../docs/02-architecture/SYSTEM_DESIGN.md#2-key-sequence--signal--trend--scorecard--alert).
