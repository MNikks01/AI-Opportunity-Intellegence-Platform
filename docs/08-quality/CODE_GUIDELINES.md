# Code Guidelines & Development Standards

**Phase 18 · Status: complete · Last updated: 2026-07-03**
**Enforced by:** ESLint (`@aioi/eslint-config`), Prettier (`@aioi/prettier-config`), strict TS
(`tsconfig.base.json`), Commitlint, Husky + lint-staged, and CI. See also [CLAUDE.md](../../CLAUDE.md).

## 1. Language & types
- **TypeScript strict everywhere.** No `any` at module boundaries; `unknown` + narrowing instead.
  `noUncheckedIndexedAccess` is on — handle `undefined` from index access.
- Validate **all external input** with Zod at the boundary (`@aioi/validation`); never trust network,
  env, or user data. Infer types from schemas (`z.infer`) — one source of truth.
- Prefer pure functions + explicit return types on exported APIs. Avoid classes unless modeling identity/lifecycle.

## 2. Imports & structure
- Use workspace packages (`@aioi/*`), never deep relative paths across packages.
- All LLM calls go through `@aioi/ai-sdk`. All DB access through `@aioi/database`. Auth/RBAC through `@aioi/auth`.
- Services follow a light module structure: `src/modules/<domain>/{route,service,repo,schema}.ts`.
  Business logic lives in `service`; transport (tRPC/REST) is thin.

## 3. Errors & logging
- Throw typed errors; map to RFC 9457 at the REST edge and `TRPCError` internally. Never leak internals.
- Log via `@aioi/logger` (pino) — structured, with `traceId`/`orgId`; never `console.log`; never log secrets/PII.
- Every mutating/privileged action writes an `AuditLog` entry.

## 4. Security (always-on)
- RBAC check before every handler (tRPC procedure / REST route / WS channel). Deny by default.
- Tenant guard injects `organizationId`; rely on RLS + guard, never trust client-supplied org ids.
- Parameterized queries only (Prisma). Encode output. Verify webhook signatures. Rate-limit at edge + app.
- Secrets from env/secret manager only; `.env` is gitignored; `.env.example` documents keys.

## 5. AI code
- Prompts are versioned; scoring conforms to `opportunity-scoring-engine` (rubric + `score.schema.json`).
- **No prompt/model/RAG change merges without a green `llm-eval-harness` run** (CI smoke gate).
- Tag every LLM call with cost/latency in Langfuse; respect org cost caps; cache scorecards.

## 6. Tests
- Vitest for unit/integration; RTL for components; Playwright for E2E; MSW for network mocks.
- Every connector: happy-path + 429 + malformed + empty (per `data-source-integration`).
- Coverage gate on changed packages; a11y test for UI components; no snapshot-only tests.
- Test behavior, not implementation. Deterministic; no real network in unit tests.

## 7. Git & reviews
- **Conventional Commits** (`feat(api): …`), enforced by Commitlint. Small, focused PRs.
- Branch: `main` protected; work on `feat/*`, `fix/*`, `chore/*`. Squash-merge.
- Every PR: passes CI (lint/typecheck/test/build/eval-smoke/security), has a description of what/why/test,
  and a `/code-review` pass on nontrivial changes. Versioning via Changesets; SemVer.

## 8. Accessibility & performance
- WCAG 2.2 AA (see Design System). Keyboard + focus + ARIA + reduced-motion respected.
- Respect performance budgets (PRD NFRs): dashboard TTFB < 500ms p75, API p95 < 300ms. Cache read models.

## 9. Definition of Done (per story)
- [ ] Meets acceptance criteria; behind a feature flag if risky.
- [ ] Types strict, input validated, RBAC + audit where applicable.
- [ ] Tests (unit + relevant integration/E2E) green; coverage not reduced.
- [ ] For AI changes: eval harness green. For migrations: migration-auditor pass.
- [ ] Docs/ADR updated if behavior or a decision changed. Observability (logs/traces) added.
- [ ] `CHANGELOG.md` `[Unreleased]` updated for any user- or dev-facing change.

## 10. Review checklist
- [x] Standards are enforceable by tooling, not just prose.
- [x] Security, AI-quality, and tenancy rules are explicit and non-optional.
- [x] Definition of Done ties back to PRD acceptance criteria + quality gates.
