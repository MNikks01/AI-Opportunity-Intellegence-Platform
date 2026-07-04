# Sprint Plan

**Phase 22 · Status: complete (Sprint 0–1 planned) · Last updated: 2026-07-03**
**Traces to:** [Prioritization](../01-product/FEATURE_PRIORITIZATION.md) · [Roadmap](ROADMAP.md) · [Backlog](BACKLOG.md)

Two-week sprints. Goal of the first sprints: prove the **critical path** end-to-end before breadth —
ingest a real source → cluster into a Trend → generate an eval-gated scorecard. Everything else (UI,
auth, billing) builds on this spine.

## Sprint 0 — Foundation (skeleton → runnable) ✅ in progress

**Goal:** repo installs, builds, tests, and the DB schema applies locally.

- [x] Monorepo skeleton, shared configs, Prisma schema, Docker stack, CI baseline (Phase 17–19).
- [ ] `pnpm install`; `@aioi/database` migrates against local Postgres (pgvector enabled).
- [ ] `@aioi/shared` + `@aioi/validation` core contracts (SourceRecord, Score) implemented + tested.
- **Exit:** `pnpm typecheck && pnpm test` green; `prisma migrate` applies; pgvector index created.

## Sprint 1 — Critical-path vertical slice ▶ current

**Goal:** one real trend, scored, proven end-to-end.

- **S1-1** `@aioi/ingestion-service`: Hacker News connector (official API, no ToS risk) — fetch,
  Zod-validate, normalize to `SourceRecord`, idempotent upsert. Tests: happy/429/malformed/empty (MSW).
- **S1-2** Clustering: embed + nearest-trend (pgvector) with heuristic fallback → create/attach `Trend`.
- **S1-3** `@aioi/ai-sdk`: provider-agnostic LLM client (LiteLLM) + **deterministic stub provider**
  (used when no API key) + Langfuse hook + structured-output + Zod validation.
- **S1-4** `@aioi/ai-service`: `scoreTrend()` per `opportunity-scoring-engine` (rubric + `score.schema.json`),
  composite computed from sub-scores, cached by `(trendId, dimension, rubricVersion)`.
- **S1-5** `llm-eval-harness` smoke: golden case + CI gate wired.
- **Exit:** a script/test ingests a HN item → produces a `Trend` with a valid 10-dimension scorecard,
  all types strict, all tests green, eval smoke passes.

## Sprint 2 — Read path + first UI

- `@aioi/api` (Fastify + tRPC): `trends.list` / `trends.byId` read models; REST `/api/v1/trends`.
- `@aioi/database` repositories; Redis read-model cache.
- `apps/web`: Trend Dashboard + Trend Detail (scorecard) using `@aioi/ui` primitives + `dataviz`.
- Auth via `@aioi/auth` (Clerk) gating the app; personal Workspace bootstrap.
- **Exit:** logged-in user sees real scored trends in the UI.

## Sprint 3 — Retention loop

- Watchlists + Alerts (in-app/email) + Daily Brief batch job (`@aioi/notification-service` + scheduler).
- Semantic + keyword search endpoints. Billing (Free/Pro) via Stripe.
- **Exit:** the PRD core loop (trend → score → action → save/alert/brief) is live for beta.

## Capacity & assumptions

- Assumes a small full-stack team; story points relative. AI features gated by eval harness at all times.
- Biggest risk carried from PRD A1 (Tier-1 sources sufficient) — Sprint 1 uses HN to de-risk cheaply.

## Ceremonies & DoD

Sprint planning → daily async standup → mid-sprint check → review + retro. Definition of Done per
[CODE_GUIDELINES §9](../08-quality/CODE_GUIDELINES.md). Each sprint ends by updating this file + backlog + roadmap.

## Review checklist

- [x] First sprints prove the critical path before breadth.
- [x] Every sprint has a goal, stories tied to backlog IDs, and an exit criterion.
- [x] AI-quality gate present in every AI sprint; riskiest assumption de-risked early.
