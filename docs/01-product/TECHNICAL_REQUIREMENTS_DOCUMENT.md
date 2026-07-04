# Technical Requirements Document (TRD)

**Product:** AI Opportunity Intelligence Platform
**Status: complete (baseline) · Owner: Principal Architect · Last updated: 2026-07-03**
**Related:** [PRD](PRODUCT_REQUIREMENTS_DOCUMENT.md) · [ADR-0001 Core Stack](../adr/ADR-0001-core-stack.md)

This TRD turns the PRD into technical requirements and records the **stack decisions with
justifications** the brief asks for. Deep designs (DB, API, system) follow in Phases 13–16; this
sets the binding baseline they must conform to.

---

## 1. Architecture style

**Modular monolith-of-services in a monorepo**, event-driven at the seams. Not micro-everything on
day one (that would over-distribute a small team), but cleanly separated services so we can scale
the hot paths (ingestion, AI) independently.

- **Sync path:** `apps/web` ⇄ `services/api` (typed RPC).
- **Async path:** `services/scheduler` enqueues → `services/ingestion-service` (source workers) →
  emits `signal.ingested` → `services/ai-service` scores/generates → emits `trend.updated` →
  `services/notification-service` fans out alerts/briefs.
- **Bus:** Redis Streams / BullMQ events for MVP (simple, already in-stack); pluggable to a real
  broker (NATS/SQS) later without changing producers/consumers. See EVENT_DRIVEN_ARCHITECTURE.

## 2. Technology decisions & justifications

Each decision is an ADR; ADR-0001 records the core set. Summary:

| Area               | Decision                                                                       | Why (short)                                                                                     | Rejected alt                                                                            |
| ------------------ | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Language           | **TypeScript everywhere**, strict                                              | one language across web/api/workers; shared types                                               | —                                                                                       |
| Monorepo           | **pnpm workspaces + Turborepo**                                                | fast, cached, content-hash task graph                                                           | Nx (heavier), Bazel (overkill)                                                          |
| Web                | **Next.js (App Router) + React**                                               | SSR/ISR for SEO (our acquisition engine), RSC, Vercel-native                                    | Remix, SPA (worse SEO)                                                                  |
| UI                 | **Tailwind + shadcn/ui base → custom `packages/ui`**                           | own our identity, not a template look                                                           | MUI/Chakra (heavier, generic)                                                           |
| Data/state         | **React Query (server) + Zustand (client)**                                    | clear split: server-cache vs UI state                                                           | Redux (boilerplate)                                                                     |
| Forms/validation   | **React Hook Form + Zod** (shared with backend)                                | one schema, client+server                                                                       | Yup, Formik                                                                             |
| Tables/charts/flow | **TanStack Table, Recharts, React Flow**                                       | per brief; fit dashboards                                                                       | —                                                                                       |
| Backend framework  | **Fastify** (thin module structure)                                            | highest-throughput Node, low overhead for API+workers, first-class schema/OpenAPI               | NestJS (heavier DI/opinion; we adopt its _structure_ lightly without the framework tax) |
| Internal API       | **tRPC** (web ⇄ api)                                                           | end-to-end types, zero client codegen, both sides TS                                            | REST-only (loses types)                                                                 |
| External API       | **REST + OpenAPI** (public API, webhooks, extension)                           | language-agnostic, cacheable, documentable                                                      | tRPC (bad for third parties)                                                            |
| ORM/DB             | **Prisma + PostgreSQL**                                                        | typed queries, migrations, mature                                                               | Drizzle (viable; Prisma's tooling wins for team)                                        |
| Vector             | **pgvector in Postgres** (MVP)                                                 | one datastore, good enough at MVP scale                                                         | Pinecone/Weaviate (premature ops cost) — revisit at scale (ADR)                         |
| Cache/queue        | **Redis + BullMQ**                                                             | caching, rate-limit, job queues, Streams bus                                                    | RabbitMQ/Kafka (premature)                                                              |
| Realtime           | **WebSockets** (via Fastify/socket layer)                                      | live dashboard/alert updates                                                                    | polling (worse UX)                                                                      |
| Auth               | **Clerk for v1, behind `packages/auth` adapter**                               | orgs, roles, SSO, MFA out-of-box → speed; adapter lets us swap to Auth.js if lock-in/cost bites | Auth.js (more build), roll-our-own (risky)                                              |
| AI gateway         | **LiteLLM** unified proxy                                                      | one interface to OpenAI/Anthropic/Gemini/OpenRouter; routing, fallback, cost caps               | per-SDK glue (fragile)                                                                  |
| LLM observability  | **Langfuse** (LLM traces/prompts/evals) + **OpenTelemetry** (app/infra traces) | Langfuse is LLM-native (token/cost/eval); OTel is the vendor-neutral standard for the rest      | one-or-the-other (each covers a different layer)                                        |
| MCP                | **`@modelcontextprotocol` server(s)**, scaffolded via `mcp-builder` skill      | native to our MCP-discovery feature + lets power users query our data                           | —                                                                                       |
| Error tracking     | **Sentry**                                                                     | mature, SDKs for Next/Node                                                                      | self-host (ops cost)                                                                    |
| Storage/CDN        | **Cloudflare R2 (S3-compatible) + Cloudflare CDN/WAF**                         | S3 API, no egress fees, WAF/CDN in one                                                          | AWS S3+CloudFront (egress cost)                                                         |
| Hosting (MVP)      | **Vercel** (web/marketing/docs) + **Fly.io** (services/workers/Postgres/Redis) | Vercel = best Next.js DX/SEO; Fly = cheap global always-on workers + managed PG/Redis           | Railway/Render (fine; Fly wins on global + volumes)                                     |
| Hosting (scale)    | **AWS** (ECS Fargate + RDS Postgres + ElastiCache + SQS)                       | proven scale path; migrate services when load demands                                           | stay on Fly (revisit via ADR)                                                           |
| Payments           | **Stripe** (Billing + metered usage)                                           | standard; metered API billing, tax, invoicing                                                   | Paddle (MoR alt — revisit for VAT)                                                      |

Comparisons for Fastify/NestJS, tRPC/REST, Clerk/Auth.js, Fly/Railway/Render, pgvector/dedicated
vector DB are expanded in ADR-0001 and follow-on ADRs.

## 3. Monorepo layout (binding; realized in Phase 17)

```
apps/       web · admin · marketing · docs
services/   api · ai-service · ingestion-service · scheduler · notification-service
packages/   ui · config · eslint-config · prettier-config · tsconfig · logger · auth ·
            analytics · ai-sdk · database · shared · validation
infra/      docker · kubernetes · terraform · github · monitoring
docs/  .claude/  .agents/  .github/  scripts/
```

- `packages/ai-sdk` wraps LiteLLM + Langfuse + the scoring/eval contracts (the only place that
  talks to model providers). `packages/database` owns Prisma schema + client. `packages/validation`
  owns shared Zod schemas (used by RHF, tRPC, REST, and ingestion connectors).

## 4. Cross-cutting technical requirements

- **Multi-tenancy:** shared DB; every tenant-scoped row carries `organizationId`; enforced via
  Postgres **Row-Level Security** + an app-layer tenant guard. See MULTI_TENANCY.
- **RBAC:** roles Owner/Admin/Member/Billing/Viewer; permission checks centralized in `packages/auth`;
  enforced on every tRPC procedure + REST route + WebSocket channel.
- **AuthN:** Clerk sessions for web; signed JWTs (short-lived access + rotating refresh) for API;
  API keys (hashed, scoped, rate-limited, metered) for public API.
- **Validation:** all external input validated with Zod at the boundary; no unvalidated body reaches a handler.
- **Idempotency:** ingestion + webhook + write endpoints use idempotency keys/dedupe.
- **Audit logs:** append-only table for privileged/mutating actions.
- **Secrets:** never in code; env via platform secret managers; rotation policy documented.
- **Feature flags:** typed flag service (e.g., self-hosted Unleash or a `packages/config` provider).
- **Observability:** every service exposes `/health` + `/ready`; OTel traces; structured JSON logs
  (`packages/logger`, pino); Langfuse spans for every LLM call tagged with `promptVersion`+cost.

## 5. AI subsystem requirements

- All model calls go through `packages/ai-sdk` (LiteLLM) — providers are swappable; cost caps + fallback.
- Scoring uses `opportunity-scoring-engine` (versioned rubric + strict JSON schema + evidence).
- **No prompt/model/RAG change deploys without a green `llm-eval-harness` run** (CI gate).
- RAG: embeddings in pgvector; retrieval faithfulness gated by the eval harness.
- Cost controls: cache scorecards per (trend, rubricVersion); draft with cheaper models, finalize
  with stronger; compress tool/RAG context (evaluate `headroom-ai`) to cut tokens 60–95%.

## 6. Quality, testing, CI/CD (baseline; detail in Phases 18–19, 24)

- Strict TS, ESLint, Prettier, EditorConfig, Commitlint + Conventional Commits, Husky + lint-staged,
  Changesets, Dependabot/Renovate, dead-code + unused-dep detection, bundle analysis.
- Tests: Vitest (unit), React Testing Library, Playwright (E2E), MSW (network mocks), coverage gates,
  a11y tests, visual regression, load tests, API contract tests.
- CI gates (GitHub Actions): lint → typecheck → unit → integration → **llm-eval smoke** → build →
  docker build → security/dependency/license/secret scan → coverage → preview deploy. Main adds
  E2E + full eval + prod deploy + DB migration + release automation + rollback + Slack notify.

## 7. Security requirements (baseline; full SECURITY_GUIDE + THREAT_MODEL in Phase 7 dir)

OWASP ASVS L2; Helmet/secure headers; CORS allowlist; CSRF protection on cookie flows; rate
limiting (Redis) per-IP + per-key; JWT rotation + refresh; encrypted secrets; parameterized queries
(Prisma) → no SQLi; output encoding → no XSS; file-upload scanning + type/size limits; signed +
verified webhooks; audit logging; secret scanning in CI; least-privilege IAM. Security skills:
`trailofbits/*` (recommended install), `web-design-guidelines` (client-side a11y/sec review).

## 8. Performance & scalability requirements

- Read models denormalized/cached (Redis) for dashboards; TanStack Query stale-while-revalidate.
- Ingestion + scoring are queue-backed, horizontally scalable, and provider-rate-limited.
- Postgres: proper indexing, `pgvector` HNSW index for semantic search, read replicas at scale.
- CDN/ISR for public/marketing/blog (SEO). Full plan in SCALABILITY_PLAN (Phase 27).

## 9. Assumptions, risks, decisions log

- Clerk chosen for speed; **exit ramp = `packages/auth` adapter** (risk: cost/lock-in → ADR revisit).
- pgvector chosen over dedicated vector DB for MVP (risk: recall/latency at scale → ADR revisit).
- Fly.io for services MVP; AWS is the documented scale target (risk: migration effort → planned).
- Event bus starts on Redis/BullMQ (risk: durability/throughput ceiling → swap to NATS/SQS behind
  the same producer/consumer interface).

## 10. Review checklist

- [x] Every PRD NFR has a technical mechanism named here.
- [x] Every major stack choice has a justification + rejected alternative (→ ADR-0001).
- [x] Multi-tenancy, RBAC, auth, validation, audit, secrets, observability all specified.
- [x] AI subsystem gated by eval harness + versioned rubric.
- [x] Security baseline set to OWASP ASVS L2 with concrete controls.
- [x] Monorepo layout binding for Phase 17.
