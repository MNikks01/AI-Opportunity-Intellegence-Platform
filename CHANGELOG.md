# Changelog

All notable changes to this project are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · Versioning: [SemVer](https://semver.org/).

This is the **repository** changelog (engineering release notes). The user-facing product
"what's new" Changelog surface (`/changelog`) is a separate product feature (R3). Automated
generation via Changesets will be wired when we start versioned releases; until then this file is
maintained by hand each change, and every PR updates the `[Unreleased]` section.

## [Unreleased]

### Added
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

### Known issues / polish
- UI: acronym casing ("Seo" → "SEO"); score-bar fill contrast faint in dark mode.

### Not yet implemented (tracked in BACKLOG)
- Auth (`@aioi/auth` Clerk adapter + RBAC + tenant guard), real embedding-based clustering,
  `llm-eval-harness` golden-set CI gate, Langfuse tracing, Redis read-model cache, retention loop
  (watchlists/alerts/brief).

---

_No tagged releases yet — the project is pre-`0.1.0`. The first release will move the relevant
`[Unreleased]` entries under a dated version heading._
