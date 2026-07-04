# Changelog

All notable changes to this project are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · Versioning: [SemVer](https://semver.org/).

This is the **repository** changelog (engineering release notes). The user-facing product
"what's new" Changelog surface (`/changelog`) is a separate product feature (R3). Automated
generation via Changesets will be wired when we start versioned releases; until then this file is
maintained by hand each change, and every PR updates the `[Unreleased]` section.

## [Unreleased]

### Changed
- deps: adopt safe major dependency bumps validated by CI — turbo 2.10, @types/node 26, pino 10,
  next 16, lint-staged 17, @commitlint/{cli,config-conventional} 21, zod 4, eslint 10. (TypeScript 6
  held back — fails typecheck; tracked as B-026.)

### Added
- **API-key authentication** (B-014 cont., ADR-0002 D6) — `@aioi/auth` `ApiKeyAuthProvider`
  (`Authorization: Bearer aioi_…`), SHA-256 hash-only storage, `generateApiKey`/`hashApiKey`, org-scoped
  contexts gated by **scopes** (a key never exceeds its scopes), and a `ChainAuthProvider` (API key →
  session) surfaced via `getAuthProvider`. 11 unit tests. DB-backed lookup + management endpoints follow.
- **Restricted runtime DB role** (B-027, ADR-0003) — migration creates a `NOSUPERUSER NOBYPASSRLS`
  `aioi_app` role (NOLOGIN; login/password from secrets in prod) with CRUD grants + default privileges;
  the `@aioi/database` client connects via `APP_DATABASE_URL` (falls back to `DATABASE_URL`). This makes
  RLS actually enforce at runtime — the whole test suite + RLS tests now run as `aioi_app` in CI and
  assert a non-superuser identity.
- **Row-Level Security** (B-014 cont., ADR-0003) — `FORCE` RLS + `tenant_isolation` policies on
  org-scoped tables (Workspace/Watchlist/ApiKey/AuditLog/Brief/Subscription), a per-transaction org GUC
  via `@aioi/database` `withOrgContext(orgId, fn)`, fail-closed by default. Proven with 4 integration
  tests through a restricted (non-superuser) role. Note: the runtime must connect as a non-superuser
  role for RLS to enforce (superusers bypass it) — wiring tracked as B-027.
- **`@aioi/auth`** (B-014) — provider-neutral auth adapter (Clerk behind `ClerkAuthProvider`, a
  deterministic `StubAuthProvider` for dev/test), RBAC (5 roles → permission catalog, deny-by-default
  `can`/`requirePermission`), and a tenant guard. Wired into `@aioi/api` context + a `protectedProcedure`.
  Decision recorded in ADR-0002. (Clerk verification, RLS wiring, API-key auth, and sign-up bootstrap
  are follow-on slices.)
- **Foundation & docs** — Discovery, market research, personas, competitive analysis, vision,
  PRD, TRD, ADR-0001 (core stack), user stories, feature prioritization, UX flows, wireframes,
  design system, information architecture, DB design + ERD, API design + OpenAPI, system design
  (HLD/LLD), infrastructure, code guidelines, roadmap/sprint/backlog. (Phases 1–22)
- **Monorepo** — pnpm workspaces + Turborepo; 21 `@aioi/*` workspaces; strict TS base; shared
  `eslint-config`/`prettier-config`/`tsconfig`; commitlint (Conventional Commits); baseline CI.
- **Custom Claude skills** — `data-source-integration` (legality gate), `opportunity-scoring-engine`
  (versioned rubric + score schema), `llm-eval-harness` (regression gate).
- **`@aioi/database`** — Prisma schema (23 models) + init migration on Postgres 16 with `pgvector`
  and `pgcrypto`; client singleton; repositories (`persistScoredTrend`, `listTrends`, `getTrendBySlug`).
- **`@aioi/shared`** — 10-dimension score model, bands, `TrendLike`/`SourceRecord`.
- **`@aioi/validation`** — Zod schemas mirroring `score.schema.json` (evidence-grounding enforced).
- **`@aioi/logger`** — pino structured logging with secret redaction.
- **`@aioi/ai-sdk`** — provider-agnostic LLM interface (LiteLLM) + deterministic `StubProvider`
  (runs scoring without API keys).
- **`@aioi/ai-service`** — `scoreTrend()`: per-dimension scoring, composite `opportunity` computed
  from sub-scores, `(trendId, dimension, rubricVersion)` cache.
- **`@aioi/ingestion-service`** — Hacker News connector (legality-classified, 429 backoff,
  idempotent) + repository seam.
- **`@aioi/api`** — Fastify server: tRPC (`/trpc`) + REST (`/api/v1/trends[/:slug]`) + health/readiness;
  RFC 9457 problem+json on not-found.
- **`@aioi/ui`** — design tokens (light/dark) + RSC-safe components (Card, Badge, ScoreBar,
  Scorecard, TrendCard).
- **`apps/web`** — Next.js 15 App Router: `/trends` dashboard + `/trends/[slug]` detail rendering
  real scored trends server-side.
- **Local infra** — Docker Compose stack (Postgres+pgvector, Redis, MinIO, Mailhog, LiteLLM);
  seed + demo scripts.

### Verified
- 13/13 tests green (unit + MSW connector + live-DB router integration); all packages strict-typecheck
  clean; full loop (ingest → score → persist → serve → render) confirmed in-browser.

### Fixed
- UI: acronym score dimensions now render correctly (e.g. "SEO" instead of "Seo").

### Known issues / polish
- UI: score-bar fill contrast faint in dark mode.

### Not yet implemented (tracked in BACKLOG)
- Auth (`@aioi/auth` Clerk adapter + RBAC + tenant guard), real embedding-based clustering,
  `llm-eval-harness` golden-set CI gate, Langfuse tracing, Redis read-model cache, retention loop
  (watchlists/alerts/brief).

---

_No tagged releases yet — the project is pre-`0.1.0`. The first release will move the relevant
`[Unreleased]` entries under a dated version heading._
