# Testing Strategy

**Phase 24 · Status: complete · Last updated: 2026-07-10**
**Traces to:** [TRD](../01-product/TECHNICAL_REQUIREMENTS_DOCUMENT.md) · [Code Guidelines](CODE_GUIDELINES.md) · [CI/CD](../06-infra/CICD.md)
**Realized in:** `vitest.config.ts` (root), `**/*.test.ts(x)`, `.github/workflows/ci.yml`, the `testing` skill.

Testing here is a release gate, not an afterthought: `pnpm test` runs in CI on every push and PR, and
the pre-push hook runs typecheck + test locally. A red suite blocks merge. This document records what we
test, with what tools, and where the lines are drawn.

## 1. Philosophy

1. **Test behaviour, not implementation.** Assert on observable output (returned data, rendered DOM,
   persisted rows), not private internals — so refactors don't break green tests.
2. **Fast by default, real where it matters.** The bulk of the suite runs with no network and no
   database (mocked I/O, in-memory). A smaller integration tier exercises real Postgres + pgvector.
3. **Determinism is mandatory.** No wall-clock, no live network, no random without a seed. External
   services are mocked (MSW) or stubbed (the adapter+Stub pattern used across `@aioi/*`).
4. **Every bug fix ships with a regression test.** The test reproduces the failure first, then the fix
   turns it green.

## 2. The pyramid

| Tier               | Scope                                                              | Tools                                  | Runs in CI                                            | Count today                          |
| ------------------ | ------------------------------------------------------------------ | -------------------------------------- | ----------------------------------------------------- | ------------------------------------ |
| **Unit**           | Pure functions, scoring math, formatters, Zod schemas, connectors  | Vitest                                 | always                                                | majority of 194                      |
| **Component**      | `@aioi/ui` + web components, RSC-safe render                       | Vitest + React Testing Library + jsdom | always                                                | e.g. `controls.test.tsx`             |
| **Integration**    | Repositories, RLS, migrations against real Postgres 16 + pgvector  | Vitest + live DB                       | CI (service container) / skipped locally without a DB | 87 skipped-when-no-DB                |
| **Contract / API** | Fastify server, tRPC + REST routes, OpenAPI shape                  | Vitest (in-process server)             | always                                                | `services/api/src/server.test.ts`    |
| **Connector**      | Ingestion connectors: happy / 429 / malformed / empty / idempotent | Vitest + **MSW**                       | always                                                | per source under `ingestion-service` |
| **AI eval**        | Scoring/summary/action-plan quality + schema validity              | `llm-eval-harness` (golden set)        | determinism gate in CI; full run keys-gated           | B-009                                |
| **E2E**            | Critical user journeys in a real browser                           | Playwright (`webapp-testing` skill)    | on demand / smoke                                     | scaffolded                           |

**Current state:** `39 test files passed, 194 tests passed, 87 skipped` — the skips are the
DB-integration tier, which self-skips when no `DATABASE_URL` points at a live Postgres. In CI a
`pgvector/pgvector:pg16` service container is provisioned, migrations are applied, and the restricted
`aioi_app` role is granted login so RLS is genuinely exercised (ADR-0003 / B-027).

## 3. Tooling

- **Runner:** [Vitest](https://vitest.dev) — one root `vitest.config.ts` collects `**/*.test.ts(x)`
  across the workspace. Run everything with `pnpm test`; a single package with
  `pnpm --filter @aioi/<pkg> test`.
- **Network mocks:** [MSW](https://mswjs.io) intercepts HTTP at the fetch layer — every external
  connector is tested against recorded response shapes, including error and rate-limit paths, with no
  real network. This is a **non-negotiable** for shipping a connector (see the
  `data-source-integration` skill).
- **DOM/component:** React Testing Library + jsdom. Components are queried by role/label (a11y-first),
  never by test-id-only selectors where a semantic query exists.
- **Adapter + Stub:** every external integration (Clerk, Stripe, Resend, LiteLLM, Slack/Discord) sits
  behind an adapter with a deterministic `Stub` implementation. Tests and keyless CI run the Stub; prod
  activates the real client on config. This is why the suite is green with **zero secrets**.
- **AI evaluation:** the `llm-eval-harness` provides a versioned golden dataset and a provider-agnostic
  run via LiteLLM, scoring faithfulness / relevance / schema-validity / cost / latency with a CI
  pass/fail gate and a regression diff, so AI quality cannot silently degrade.

## 4. What each layer must cover

- **Scoring engine (`ai-service`):** composite derives from sub-scores; output validates against
  `score.schema.json`; rationale + confidence present; a golden regression case per scoring change
  (opportunity-scoring-engine skill).
- **Connectors (`ingestion-service`):** happy path, HTTP 429/5xx backoff, malformed payload, empty
  result, and **idempotency** (re-running a job produces no duplicate signals).
- **Repositories (`@aioi/database`):** CRUD round-trips, enum mapping, pagination, and **tenant
  isolation** — a query as org A must never see org B's rows (RLS).
- **API (`services/api`):** auth/RBAC enforced, validation rejects bad input (Zod), error envelope
  shape, and the public REST surface matches `openapi.yaml`.
- **Billing (`@aioi/billing`):** entitlements come from Stripe state, never the client; webhook
  signature verification; plan gating at the write path.
- **UI (`@aioi/ui`, `apps/web`):** renders in the RSC boundary, keyboard/focus behaviour, and the
  loading/empty/error states (see the `accessibility` skill — a11y is checked on every UI change).

## 5. Coverage & gates

- **Gate, not vanity metric.** The merge gate is _the suite passing_, plus lint, format, typecheck, and
  build — all in the `quality` job of `ci.yml`. We track coverage to find blind spots, not to chase a
  number; critical modules (scoring, billing, RLS, connectors) are the ones we hold to a high bar.
- **Pre-push hook** runs typecheck + test so red never reaches the remote.
- **AI changes** additionally require a green `llm-eval-harness` run — no prompt/model/RAG change merges
  without it.

## 6. Fixtures & data

- Deterministic fixtures live beside their tests; shared builders return typed domain objects.
- Integration tests run migrations then truncate/rollback per case; they never depend on seed order.
- Local realistic data: `scripts/seed-demo.ts` and `scripts/demo-data.ts` (HN + GitHub + HF → cluster →
  score) for manual/E2E verification, not for assertions.

## 7. Running tests

```bash
pnpm test                      # whole suite (unit/component/contract/connector); DB tier self-skips
pnpm --filter @aioi/database test   # one package
DATABASE_URL=postgres://… APP_DATABASE_URL=… pnpm test   # includes the DB-integration tier
pnpm typecheck && pnpm lint && pnpm build   # the rest of the merge gate
```

## 8. Flakiness policy

A flaky test is a broken test. Quarantine (`.skip` with a linked issue) only as a stop-gap, fix within
the sprint, and never merge a knowingly non-deterministic test. Common causes we design out up front:
un-mocked time, un-mocked network, and shared mutable state between cases.

## 9. Gaps & forward work

- **E2E breadth:** Playwright journeys are scaffolded; expand to cover sign-up → first scored
  opportunity → action plan, and the billing checkout happy path.
- **Coverage reporting in CI:** emit and trend coverage as a report artifact (informational gate first).
- **Load/soak:** performance budgets from the `performance` skill are asserted ad hoc; a scheduled load
  test against staging is future work (see [SCALABILITY_PLAN](../02-architecture/SCALABILITY_PLAN.md)).
