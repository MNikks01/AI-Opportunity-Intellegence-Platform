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
- **Live data (scheduled refresh)** — `.github/workflows/refresh-data.yml`: a free GitHub Actions
  cron (every 6h + manual) runs `demo-data.ts` (ingest HN+GitHub+HF → cluster → score) against the
  deployed DB, so new trends keep appearing. Enable by adding a `DEMO_DATABASE_URL` secret. Documented
  in DEPLOY.md.
- **Prisma serverless engine** — add `rhel-openssl-3.0.x` to `binaryTargets` so Prisma runs on Vercel/Lambda (query-engine binary present in prod).
- **Free deploy path** — `docs/10-setup/DEPLOY.md`: ship a public demo for $0 on **Vercel + Neon**
  (web + Postgres/pgvector). The web app runs standalone on a single `DATABASE_URL` (no api/Redis/keys)
  — verified: builds without DB connectivity, serves all pages green. New `scripts/demo-data.ts` loads
  real trends (ingest 3 keyless sources → cluster → score).
- **Fix Clerk auth on Next.js 16** — Next 16 replaced the `middleware.ts` convention with
  `proxy.ts`; renamed the file so `clerkMiddleware()` is detected again (fixes "auth() … can't detect
  clerkMiddleware()" + the 404). `<SignInButton>` now uses Clerk's default button (a custom child
  tripped a "multiple children" error). Verified: `GET /` → 307 to the Clerk sign-in page.
- **Local-dev onboarding fixes** — `pnpm dev` now sets `--concurrency=25` (18 persistent dev tasks
  exceeded turbo's default 10); `scripts/seed-demo.ts` scores with the Stub so it works offline with no
  keys; and RUNNING_LOCALLY now configures/sources `.env` **before** `docker compose up` (via
  `--env-file .env`) so the LiteLLM container gets AI keys at boot — fixes a `LiteLLM 401` on seed.
- **README rewrite** — reflects the real product: autonomous pipeline diagram, six connectors, the built feature set, real stack + monorepo layout, and a copy-paste quickstart.
- **Autonomous scoring loop closed** — clustering created trends but left them unscored; now
  `scoreClusteredTrends` (via `listUnscoredTrends` + `persistScoresForTrend`) scores them with the
  opportunity engine (+ embedding + alert eval), and a scheduler **scoring job** runs after
  clustering. The pipeline is now truly end-to-end: ingest → cluster → **score** → alerts/briefs.
  Verified live with real AI (cluster → real gpt-4o-mini scorecard). 1 test.
- **Scoring model auto-selection** — `getProvider` now picks a chat model matching your provider
  key (`defaultChatModel`: Anthropic → `claude-opus-4-8`, OpenAI → `gpt-4o-mini`; `AIOI_SCORING_MODEL`
  wins). Fixes a footgun where an OpenAI-only key returned a real provider that called the
  Anthropic-default model and 401'd. Verified live: OpenAI-only → gpt-4o-mini → 10 real scores. 2 tests.
- **Clustering threshold tuned for real embeddings** — default cosine threshold 0.72 → **0.5**
  (env `CLUSTER_THRESHOLD`). With real embeddings, differently-worded cross-source signals about the
  same topic (~0.55 cosine) now merge into one trend while unrelated (~0.2) stay separate; verified
  end-to-end against OpenAI embeddings. Also quotes special values in `.env.example` so `source .env`
  works. 1 test.
- **Per-source ingestion run stats** — each connector pass records an `IngestionRun` (status +
  new-item count + timing) via `recordIngestionRun`; `getSourceStats` now includes the latest run per
  source and the `/sources` page shows a **Last run** column. Best-effort (never breaks a pass). 1 test.
- **Re-embed backfill** — `reembedAllTrends` + `scripts/reembed-trends.ts`: re-embed every
  existing trend with the current embedder (batched, resilient). Run it after enabling a real embed
  model so trends created with the Stub become semantically searchable. 1 test.
- **Connector health surface** — `getSourceStats` (per-source signal counts + last-ingested
  time), an admin-gated `sources.stats` tRPC endpoint, and a `/sources` page rendering it with the
  `@aioi/ui` `DataTable` (source · signals · last ingested · legality tier). 2 tests.
- **Real embeddings, production-hardened** — `LiteLLMEmbedder` now requests `dimensions: 1536`
  (matches the pgvector column for any model), unit-normalizes, preserves order, retries 429/5xx, and
  fails loudly on a count/dim mismatch; embedding backfill is best-effort (a provider outage no longer
  fails scoring). Adds `infra/docker/litellm.config.yaml` so the proxy routes the embed + chat models.
  With `OPENAI_API_KEY`, clustering + semantic search become genuinely semantic (Stub otherwise). 5 tests.
- **Product Hunt + YouTube ingestion connectors** — official Product Hunt GraphQL v2 (top
  launches) and YouTube Data API v3 (AI video search, `YOUTUBE_QUERY`). Normalize to SourceRecords,
  dedupe via the shared SignalRepository, scheduled hourly; both **no-op without their key** so CI
  stays green. Legality: OFFICIAL. Completes the **six** planned connectors (HN, Reddit, GitHub, HF,
  Product Hunt, YouTube). 8 tests.
- **Hugging Face ingestion connector** — official Hub API: ingests the top models
  (`HF_SORT`, default `likes`), normalizes to SourceRecords, dedupes via the shared SignalRepository.
  Works **unauthenticated**; `HUGGINGFACE_TOKEN` raises the limit. Scheduled hourly. Legality:
  OFFICIAL (public models only). 4 tests.
- **GitHub ingestion connector** — official REST **Search API**: surfaces *emerging* AI repos
  (`GITHUB_QUERY`, default `topic:llm`, filtered to recently-created, ranked by stars), normalizes to
  SourceRecords, dedupes via the shared SignalRepository. Works **unauthenticated**; `GITHUB_TOKEN`
  raises the rate limit. Scheduled hourly; 403/429 rate-limit backoff. Legality: OFFICIAL. 5 tests.
- **Reddit ingestion connector** — official Reddit Data API over **app-only OAuth**
  (client_credentials): fetches hot posts from `REDDIT_SUBREDDITS` (default: AI/SaaS subs), normalizes
  to SourceRecords, dedupes via the shared SignalRepository, and is scheduled at :15/:45. No-ops
  without `REDDIT_CLIENT_ID`/`SECRET` (CI stays green). Legality: OFFICIAL — public listings only,
  required User-Agent, no scraping/PII. 9 tests.
- **Setup docs** — `docs/10-setup/ENV_SETUP.md` (where to get each API key, step by step) and
  `docs/10-setup/RUNNING_LOCALLY.md` (run the whole stack manually).
- **LLM eval harness** (B-009) — `runEvalHarness` runs a golden trend through scoring +
  action-plan generation and asserts invariants + determinism (10 dims, schema-valid, in-range,
  evidence-grounded, composite opportunity, non-empty plan). A test runs it, so a regression in AI
  logic fails CI. Layers quality thresholds on top when a real provider is configured.
- **UI components** (B-012) — `@aioi/ui` gains `Button` (primary/secondary/ghost) and a generic,
  accessible, responsive `DataTable` (`Column<T>` render fns + empty state). Vitest now collects
  `.test.tsx` (render tests via `renderToStaticMarkup`). 3 tests.
- **GDPR export/delete** (B-023) — `exportOrgData` (org-scoped data portability, secrets
  excluded) + `deleteOrg` (right-to-erasure hard delete, cascades) and a `gdpr` tRPC router (export
  admin-gated; deleteOrg owner-only). Also **hardens all RLS policies** with
  `NULLIF(current_setting('app.current_org',true),'')` so an unset/empty org context fails closed
  instead of throwing `''::uuid` on pooled connections. 4 tests.
- **Signal → Trend clustering** (B-006) — connects ingestion to trends: `clusterSignals` (embed +
  greedy cosine; deterministic offline via the StubEmbedder) + `clusterRecentSignals` orchestration;
  `@aioi/database` `listUnclusteredSignals`/`createTrendFromSignalIds`; and an hourly scheduler
  clustering job. Swaps to real semantic clustering with a real embedder. 3 tests.
- **Email delivery** — new `@aioi/email`: an `EmailProvider` seam (Stub outbox + **Resend**) with
  brief/alert templates. The scheduler's daily-brief job now **emails each org's members**
  (`@aioi/database` `listOrgMemberEmails`) — captured by the Stub outbox offline, sent via Resend when
  `RESEND_API_KEY`+`EMAIL_FROM` are set. 5 tests. Also registers the `email` commitlint scope.
- **Stripe payments** (B-020 cont.) — a `BillingProvider` seam (`@aioi/billing`) with a deterministic
  `StubBillingProvider` and a Stripe implementation (checkout sessions) gated on
  `STRIPE_SECRET_KEY`+`STRIPE_PRICE_PRO`. `billing.checkout` returns a session URL; a
  signature-verified `POST /webhooks/stripe` syncs `customer.subscription.*` → `setPlan` (via the
  subscription's `orgId` metadata). Inert without keys. 6 tests.
- **API-key management + auth lookup** (B-014 cont.) — completes the API-key path: `createApiKey`
  (raw shown once, SHA-256 stored), `listApiKeys` (never exposes the hash), `revokeApiKey`
  (org-scoped, RLS), and a SECURITY DEFINER `app_find_api_key` for the auth-time lookup. Wired into the
  API context (`getAuthProvider({ apiKeyLookup })`) so `Authorization: Bearer aioi_…` authenticates
  against the DB (revoked keys denied), plus an admin-gated `apikeys` router. 5 tests.
- **Frontend Clerk sign-in** — `apps/web` wires `@clerk/nextjs` **conditionally** on
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: `ClerkProvider` + a header Sign-in/UserButton, `clerkMiddleware`
  (pass-through without keys), and `getDevOrg` now resolves the **signed-in user's** tenant (via
  `bootstrapUser`) when Clerk is on — falling back to the dev tenant otherwise. Builds/CI stay green
  without keys.
- **Clerk verifier + sign-up webhook** (B-014/B-015) — the API now verifies real Clerk session JWTs
  (`@clerk/backend`) via the auth adapter when `CLERK_SECRET_KEY` is set (else the dev Stub), and a
  Svix-verified `POST /webhooks/clerk` provisions a tenant on `user.created` (`handleClerkUserEvent →
  bootstrapUser`, idempotent). `buildServer` is now async (raw-body for signature verification). Inert
  without keys, so CI stays green. 5 tests (verifier without key; webhook handler; server smoke).
- **Scheduler service** — `@aioi/scheduler` (BullMQ + cron): `runIngestionJob` (HN ingestion every 30m)
  and `runDailyBriefsJob` (fan out `generateDailyBrief` over all active orgs, at 07:00 UTC). Pure job
  functions (testable without Redis) + a thin `startScheduler` worker; `@aioi/database`
  `listActiveOrgIds` for the fan-out. Activates the autonomy for B-018/B-024. 1 integration test. (Also
  adds `main`/`types` to `@aioi/ingestion-service`.)
- **Billing & entitlements** (B-020) — new `@aioi/billing` (plans + per-plan entitlements + `withinLimit`
  + `PlanLimitError`, Stripe-agnostic). `@aioi/database` `getPlan`/`setPlan`/`getEntitlements` (Subscription,
  org-scoped RLS); **`createWatchlist` now enforces the plan's watchlist limit** (FREE=5, PRO=unlimited).
  `billing` tRPC router (plan/setPlan) with `PlanLimitError → FORBIDDEN`, and a `/billing` page
  (plan + entitlements + upgrade/downgrade). 8 tests. (Stripe checkout/webhooks are a follow-up.)
- **Daily Brief** (B-018) — per-org digest: `generateDailyBrief` aggregates the top-opportunity trends
  + the org's watchlist/unread-alert counts into a `Brief` (in-app delivered), with `listBriefs`/
  `getBrief` and **open tracking** (`markBriefOpened`, idempotent). `briefs` tRPC router
  (generate/list/byId/markOpened) + a `/briefs` list & detail UI (opens tracked on view). All org-scoped
  (RLS). 5 tests. (Email delivery is a follow-up.)
- **Action-plan generators** (B-021) — turn a scored trend into a concrete "what to build" plan
  (SaaS/API/content ideas, keywords, domains, product names, target audience, pricing, MVP scope, tech
  stack). `@aioi/ai-sdk` `generateActionPlan` (deterministic Stub + LiteLLM, schema-validated),
  `@aioi/ai-service` orchestration, `persistActionPlan`/`getActionPlan` + `getTrendBySlug` now includes
  the plan, an admin-gated `trends.generateActionPlan` mutation, and a plan section on the trend detail
  page. 3 tests. (Also fixes `@aioi/ai-service` `package.json` `main`/`types` so it's importable.)
- **Redis read-model cache** (B-011) — new `@aioi/cache` package: cache-aside over ioredis with
  **graceful degradation** (a cache outage falls through to the source, never throws) and a lazy
  fail-fast client. The trends read endpoints (`trends.list` 60s, `trends.search`/`semanticSearch` 30s)
  are cached. Bypassed in tests / when `CACHE_DISABLED=1`. 3 unit tests (hit/miss, invalidate, degrade).
- **Audit logging** (B-022) — a tRPC middleware on `protectedProcedure` writes an `AuditLog` entry for
  every successful **mutation** (action = procedure path, actor, kind; best-effort so it never fails the
  mutation), so all existing protected mutations are covered cross-cuttingly. `@aioi/database`
  `writeAuditLog`/`listAuditLogs` (org-scoped, RLS), and an admin-gated `audit.list` endpoint. 4 tests
  (isolation; mutation-audited-but-not-query; RBAC).
- **Prisma-backed ingestion** (B-024) — `PrismaSignalRepository` persists connector output to the
  global `Signal` table, deduping via `createMany({ skipDuplicates })` (idempotent, returns the new
  count); ensures the `Source` (+ legality tier) first. `createSignalRepository()` picks Prisma when a
  DB is configured, else in-memory; `runHackerNewsIngestion` now defaults to it. 2 integration tests.
- **Semantic trend search** (B-019) — `@aioi/ai-sdk` gains an `Embedder` (deterministic `StubEmbedder`
  + `LiteLLMEmbedder`, `EMBED_DIM=1536`); a pgvector `embedding` column + **HNSW cosine index** on
  Trend, backfilled on `persistScoredTrend`; `semanticSearchTrends(q)` (`<=>` cosine) + a public
  `trends.semanticSearch` endpoint; and a Keyword/Semantic toggle on the trends search. 6 tests
  (embedder determinism/shape + nearest-neighbor ranking). Completes B-019.
- **Trend keyword search** (B-019) — Postgres full-text search over trends: a STORED generated
  `searchVector` (title weighted above summary) + GIN index, a `searchTrends(q, limit)` repo
  (`plainto_tsquery` ranked by `ts_rank` then recency, returns the `TrendView` shape), a public
  `trends.search` tRPC endpoint, and a search box on the trends page. 5 tests. Semantic (pgvector)
  search is the next slice (needs an embedder).
- **Alerts pipeline auto-eval** (B-017) — `persistScoredTrend` now fires `evaluateTrendAllOrgs` when a
  scored trend lands, fanning out to every org watching it via a `SECURITY DEFINER` function
  (`app_orgs_watching_trend`) for RLS-safe cross-tenant discovery (ADR-0003), then per-org
  `evaluateTrendForOrg`. Alerts are now autonomous. (Email/Slack delivery remains a separate epic.)
- **Alerts & notifications web UI** (B-017) — an Alerts section on the watchlist detail (create
  `SCORE_CROSSES`/`NEW_TREND` alerts, enable/disable, delete) and a `/notifications` inbox (mark
  read / mark all read) with a nav link, all via Server Actions over the RLS-enforced repos. Verified
  end-to-end in the browser: alert → engine → in-app notification rendered.
- **Alerts engine** (B-017) — a new `Notification` model + org-scoped alert/notification repositories,
  a pure trigger matcher (`NEW_TREND`, `SCORE_CROSSES`), and `evaluateTrendForOrg` that writes in-app
  notifications for matched alerts. `alerts` + `notifications` tRPC routers (protected + RBAC
  `alerts:read`/`:write`). RLS on `Alert` (EXISTS-via-parent) and `Notification` (direct-org). 6 tests
  (matcher unit + engine/CRUD/mark-read + cross-tenant isolation). Pipeline auto-eval + email delivery
  + web UI are follow-ups.
- **Watchlists web UI** (B-016) — `apps/web` `/watchlists` (list + create + delete) and
  `/watchlists/[id]` (items + add/remove) as RSC pages driven by Server Actions over the RLS-enforced
  repository. A request-cached `getDevOrg` (idempotent `bootstrapUser`) stands in for a session until
  the Clerk verifier lands. Verified end-to-end in the browser (create list → add item).
- **Watchlists CRUD** (B-016) — first user-facing feature: `@aioi/database` watchlist/item repository
  (all ops via `withOrgContext`), a `watchlists` tRPC router on `protectedProcedure` with RBAC
  (`watchlists:read`/`:write`), and shared Zod input schemas. Adds RLS on `WatchlistItem` (EXISTS policy
  via its parent watchlist — closes a child-table gap from ADR-0003). Proven end-to-end: 9 integration
  tests covering CRUD, RBAC deny, unauthenticated, and cross-tenant isolation for both watchlists and items.
- **Sign-up bootstrap** (B-015) — `@aioi/database` `bootstrapUser({ clerkId, email, name })` idempotently
  provisions a new user's tenant on first sign-in: User (Clerk mirror) + personal Organization + OWNER
  Membership + personal Workspace, in one transaction that sets the org context for the RLS-protected
  Workspace insert. Re-running returns the existing tenant. 2 integration tests. (Clerk-webhook trigger
  wires up with the Clerk verifier.)
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
