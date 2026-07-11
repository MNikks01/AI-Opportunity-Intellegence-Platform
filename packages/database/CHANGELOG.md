# @aioi/database

## 0.25.0

### Minor Changes

- e07f082: Funding signal (M15-B / ADR-0006). A new **SEC EDGAR Form D** source (US private funding rounds) — the
  demand-side counterpart to M15-A. Free, official, public-domain; classified OFFICIAL.

  - **`sec-edgar` connector** (`fetchFormDFilings`): EDGAR full-text search filtered to Form D + AI phrases,
    Zod-validated, idempotent, backoff on 429/403. Needs a contact `SEC_USER_AGENT` (SEC fair-access) —
    no-ops without it, so CI/dev stay green with no config. MSW-style tests (happy/429/malformed/empty/
    dedupe). Wired into the refresh pipeline; auto-registers on `/sources`.
  - **Funding → demand axis:** funding filings lift a trend on the Golden Quadrant's demand axis (money in
    = validated demand) via `getTrendFundingHits` + a capped per-signal lift; `QuadrantTrend.fundingSignals`
    added. `listRecentFunding` powers the surface.
  - **`/funding` surface:** recent AI funding events (issuer, filing date, SEC link) with the trends each
    maps to. Honest US-only scope note.

  US-only in v1 (Form D is a US filing); global/paid funding is a separate future ADR. Built on the
  existing ingest→cluster→score pipeline; offline-testable, keyless CI.

- 157b114: Supply-side tracking (M15-A / ADR-0005). The supply mirror of trend momentum: models, MCP servers, and
  repos become first-class **tracked objects** with a time-series and momentum.

  - **`EntitySnapshot`** model + migration: an append-only history point per tracked entity
    (`linkedTrendCount`, `signalWeight`), written each pipeline run.
  - **`getEntityMomentumMap`** / **`computeMomentum`** (pure, unit-tested) derive accelerating / steady /
    cooling vs a ~7-day baseline, exactly like trends; **`listTrackedEntities`** powers the leaderboard.
  - **`syncSupplyEntities`** upserts `MODEL` / `REPO` / `MCP_SERVER` entities directly from the structured
    Hugging Face + GitHub signals we already ingest (no new source), with a heuristic MCP-server detector.
  - **`/entities`** gains a type-filterable, momentum-sortable **supply-side leaderboard** (with the shared
    momentum sparkline), and entity detail shows a momentum block.

  Built entirely on existing OFFICIAL sources + the `Entity` model — no new data source, no legality gate,
  offline-testable. Phase-2 watch/alert on a tracked entity (B-032) is deferred.

## 0.24.0

### Minor Changes

- eb1fc88: Alert email delivery. EMAIL-channel alert notifications are now delivered by email: a new
  Notification.emailedAt column + listPendingEmailNotifications / markNotificationsEmailed helpers, an
  alert-email builder in the notification service, and a `scripts/deliver-alerts.ts` job (hourly
  `deliver-alerts.yml` workflow, gated on RESEND_API_KEY, dry-run supported). Closes the loop on the
  alert channel users could already select.
- e6dd752: Source observability on /sources. The page now shows the full connector catalog with a data-driven
  status per source — Live (count), Failing (with the connector's actual error), Idle, or Not set up.
  Failed ingestion passes are now recorded (new recordFailedIngestionRun + error surfaced via
  getLatestRuns), so a configured-but-broken source (e.g. an expired token) shows why it produced
  nothing instead of silently reading zero. Also fixes a merge-introduced unbalanced brace in
  globals.css that had broken all CSS after the referrals block.
- 6a8f4d4: Enforce plan entitlements at the write paths. `createAlert` now enforces `maxAlerts` (Free 10)
  like `createWatchlist` already did for `maxWatchlists`, throwing `PlanLimitError`. Semantic search
  on `/trends` is gated on the `semanticSearch` entitlement (Free falls back to keyword with an
  upgrade prompt). Blocked creates redirect back with a friendly "upgrade" banner instead of erroring.
- b80c3c5: Prisma 5→7 migration (B-025). Prisma 7 replaces the bundled query-engine binary with a **driver adapter**
  (`@prisma/adapter-pg` over node-postgres) and moves connection URLs out of `schema.prisma`:

  - New `packages/database/prisma.config.ts` holds the CLI/`migrate` datasource URL (owner `DATABASE_URL`);
    it loads the monorepo-root `.env` and falls back to a localhost URL so `prisma generate` (which never
    connects) still succeeds during `pnpm install`.
  - `src/client.ts` now instantiates `PrismaClient({ adapter: new PrismaPg({ connectionString }) })` using
    `APP_DATABASE_URL ?? DATABASE_URL`, so the runtime keeps connecting as the restricted `aioi_app` role
    and RLS still enforces (ADR-0003 / B-027). The integration test's fresh connection uses its own adapter.
  - Dropped `binaryTargets` (no engine binary under adapters — removes the `rhel-openssl-3.0.x` serverless
    footgun). Kept the `prisma-client-js` generator, so `@prisma/client` imports and every repository are
    unchanged.

  Validated end-to-end: `prisma migrate deploy` via the new config + **62 DB-integration tests (including
  the RLS fail-closed suite) green against live Postgres 16 + pgvector**. Dependabot continues to hold the
  next Prisma major for a deliberate migration.

- 9d6d986: Referral loop. Each org gets a shareable referral code (Organization.referralCode); a new org can
  apply a code (referredByCode) and the referrer sees how many teams joined via their link. New
  getOrCreateReferralCode / getReferralStats / applyReferralCode helpers + a /referrals page (link,
  copy, stats, apply form). Full auto-capture at signup is a follow-on.
- 7daf15f: Related opportunities on the trend page. New relatedTrends query finds embedding-nearest trends
  (pgvector, excluding the trend itself); the trend detail "Related" section now shows shared-entity
  matches first and fills with semantically-similar trends, so even sparsely-tagged trends surface
  relevant neighbours.
- 8a17bc7: Public RSS feed. A new `/feed.xml` RSS 2.0 route serves the newest scored opportunities (title, link,
  opportunity score, build idea, pubDate) from a new `listTrendFeed` query, with feed-reader
  autodiscovery via `<link rel="alternate" type="application/rss+xml">` in the document head. A
  distribution channel for readers and automation, alongside the API/MCP surfaces.
- 4011ff2: Stripe checkout & webhook for self-serve upgrades. The `/billing` "Upgrade to Pro" button opens
  Stripe Checkout (or applies Pro directly in test mode); a signature-verified webhook is the source
  of truth for plan changes, mapping subscription events → plan via pure, unit-tested helpers and
  persisting the Stripe ids. Manage/cancel via the Stripe Billing Portal. Falls back to the offline
  Stub when STRIPE_SECRET_KEY / STRIPE_PRICE_PRO are unset.
- 7edad2e: Team tier + seat enforcement. New TEAM plan (25 seats, 200k/day API) alongside Free/Pro; every plan
  now has a maxSeats entitlement (Free 1, Pro 3, Team 25) enforced at inviteMember (throws
  PlanLimitError). Stripe checkout is plan-aware (Pro/Team prices; plan carried in metadata so the
  webhook needs no price→plan table). Pricing page shows 3 tiers; billing offers per-plan upgrades;
  the team page shows seat usage and blocks invites when full.
- d3eec43: API usage history sparkline on /billing. New getApiUsageHistory helper aggregates the existing
  per-day ApiKeyUsage rows into a zero-filled 14-day series (summed across the org's keys), rendered
  as a small SVG sparkline with the 14-day total beneath the usage meters.
- 7d8b33c: Usage-vs-limits panel on /billing. New countWatchlists / countAlerts helpers feed a set of usage
  meters (watchlists, alerts, seats, busiest-key API today) that show consumption against the plan's
  entitlements, colouring amber at ≥80% and red at the limit. Unlimited entitlements show a running
  count with no cap.

### Patch Changes

- Updated dependencies [a4f5de6]
- Updated dependencies [97f8bf4]
- Updated dependencies [b902d2c]
- Updated dependencies [4011ff2]
- Updated dependencies [7edad2e]
  - @aioi/billing@0.4.0
  - @aioi/ai-sdk@0.7.0

## 0.23.1

### Patch Changes

- ea8c984: Public `/pricing` page — Free vs Pro tiers driven by the real plan entitlements (unlimited
  watchlists/alerts, semantic search, 50,000/day API quota on Pro), with a comparison, an
  "included in every plan" list, and FAQ. Added to nav + sitemap; `@aioi/database` now re-exports
  the billing entitlements.

## 0.23.0

### Minor Changes

- d122844: API rate limiting: authenticated API keys now count against a 1,000/day quota (DB-backed), return
  X-RateLimit-* headers, and get a 429 when exhausted. Usage shown per key on /team. New ApiKeyUsage model

  - recordApiKeyUsage/getApiKeyUsageToday.

### Patch Changes

- Updated dependencies [30ddabc]
  - @aioi/billing@0.3.0

## 0.22.0

### Minor Changes

- a890f98: API keys: manage read-API keys on /team (create with one-time reveal, list, revoke) and optional
  Bearer auth on /api/v1 that raises the limit cap (anon ≤25, authed ≤100) and records usage. New
  touchApiKey; reuses the existing ApiKey infra.
- 1009efc: Newsletter subscriber capture: a Subscriber model + subscribe/unsubscribe/list data layer, a homepage
  signup form, and a token-based /unsubscribe page. The top-of-funnel list starts building now; the weekly
  send follows.

### Patch Changes

- a8f0a49: Dynamic Open Graph images: a branded social-share card per trend (title + opportunity score + build
  idea) and for the homepage, generated with next/og. Improves click-through when links are shared. New
  getTrendOg query.

## 0.21.0

### Minor Changes

- 149dd8d: Per-org digest config: an OrgIntegration model + a "Digest delivery" section on /team to connect a
  Slack/Discord incoming webhook and toggle the daily digest. RBAC-gated, audited, webhook host-validated;
  the cron delivers to each org's configured webhook (env is the fallback). New getOrgIntegration/setOrgIntegration.

## 0.20.0

### Minor Changes

- 89fa03c: Public SEO pages: a dynamic sitemap.xml (all scored trends + entities + static routes) and robots.txt,
  per-page metadata (title template, description, canonical, Open Graph/Twitter) for /trends/[slug] and
  /entities/[id], JSON-LD on trend pages, and metadataBase in the root layout. New `listTrendSlugs` /
  `getTrendSeo` / `getEntitySeo` + a `getSiteUrl` helper (NEXT_PUBLIC_SITE_URL for the canonical domain).
- f6907ac: Team members & roles: a /team page to invite members by email, assign roles, and remove them — every
  mutation RBAC-gated (owners/admins) and audit-logged. New members data layer (listMembers, inviteMember,
  updateMemberRole, removeMember, canManageMembers) + getDevMembership (current user's role).

## 0.19.0

### Minor Changes

- 2d70e24: Opt-in backfill re-score: `pnpm rescore` upgrades existing (Stub-era) trend scores to the configured
  real model, overwriting in place. Batched + queue-rotating (stalest first) so a full backfill runs
  incrementally under cost control; refuses to run on the Stub; RESCORE_DRY estimates without spend.
  New `rescoreTrends` + `listTrendsForRescore`/`touchTrend`/`countScoredTrends`.

### Patch Changes

- Updated dependencies [746979c]
  - @aioi/shared@0.2.0
  - @aioi/ai-sdk@0.6.1

## 0.18.0

### Minor Changes

- dd48ae9: Demand mining for the Golden Quadrant: detect demand-expressing signals ("Ask HN", "is there a tool
  for…", "I wish there was…", "alternative to…") and blend them into the quadrant's demand axis, so
  articulated demand lifts a trend toward "build now". New `mineDemand` + `getTrendDemandHits`.

## 0.17.0

### Minor Changes

- e91c90b: The Golden Quadrant: a /quadrant page plotting every scored trend on demand (business) × supply
  (competition), highlighting the high-demand/low-supply "build now" region, plus a ranked build-now list.
  New `listTrendsQuadrant`. First cut of the USP demand×supply view; demand axis will fold in mined signals.
- dc47b88: Trend momentum: append-only TrendSnapshot history (one point per pipeline run) → a signal-count
  velocity + 7-day delta shown as a sparkline on trend cards and a momentum panel on the detail page.
  New `recordTrendSnapshots` (wired into the cron) + `getTrendMomentumMap`; `Sparkline`/`MomentumTag` UI.

## 0.16.0

### Minor Changes

- 13a4d82: Trend ↔ entity cross-linking on the trend detail: an "Entities" chip row (linked to /entities), and a
  "Related trends" section (trends sharing entities, by shared count then opportunity). New
  `getTrendEntities` + `getRelatedTrends`.

## 0.15.1

### Patch Changes

- Updated dependencies [bdc16f0]
  - @aioi/validation@0.3.0
  - @aioi/ai-sdk@0.6.0

## 0.15.0

### Minor Changes

- 20f71a4: Entities directory: extract the recurring AI companies/models/tools/protocols from trends (curated
  keyword dictionary, in the pipeline) and browse them at /entities → each links to the trends it appears
  in. New `entities` data layer, `extractEntities`/`extractEntitiesForTrends`, and two pages + nav.

## 0.14.1

### Patch Changes

- 0fc7986: One-click "Watch" toggle on trend cards. `TrendCard` gains an `action` slot rendered above a stretched
  card link (so a button stays clickable). New data helpers: `getOrCreatePrimaryWatchlist`,
  `listWatchedTargetIds`, `removeWatchlistItemByTarget`.
- 25880d3: A "Watching" filter on the trends page shows only trends on your watchlist. `listTrendsPage` gains an
  optional `ids` restriction (empty → empty page); the browse controls add a toggle.

## 0.14.0

### Minor Changes

- e7f0515: Enrich the daily brief: each top-opportunity trend now carries its score band + top build idea (from its
  action plan). The scheduled refresh also generates a brief for the demo tenant so /briefs isn't empty.

### Patch Changes

- 0a324c5: Product Hunt connector captures rich launch data (website, makers, topics, thumbnail, comment count) and
  the trend detail renders it: what it is (tagline), the problem (description), who built it (makers + links),
  product + Product Hunt links, and topics. `getTrendResources` now returns the signal's raw payload.
- 12c676f: Close the browse→track loop: an "Add to watchlist" control on the trend page, and watchlist items now
  resolve to the trend's title + opportunity score + link (via `getTrendsByIds`) instead of a raw id.

## 0.13.0

### Minor Changes

- fbccec0: Add `listTopTrendsNeedingPlan(limit, minOpportunity)` — highest-opportunity scored trends without an
  action plan, backing auto action-plan generation.

### Patch Changes

- 05b9e7f: Surface a trend's action plan on its browse card: `TrendView.plan` carries a teaser (top SaaS idea +
  product names) from the included action plan, and `TrendCard` renders a "💡 Build idea" block when present.

## 0.12.0

### Minor Changes

- ed24c47: `listTrendsPage({ source, status, sort, page, pageSize })` — browse trends filtered by source (`Source.key`)
  and status, sorted by recency or any score dimension (highest first), with pagination. Dimension-sort
  orders ids via composable, injection-safe raw SQL then hydrates. Backs the trends browse controls.

## 0.11.3

### Patch Changes

- Updated dependencies [aa401cc]
  - @aioi/shared@0.1.0
  - @aioi/ai-sdk@0.5.1

## 0.11.2

### Patch Changes

- Updated dependencies [1a568dd]
  - @aioi/ai-sdk@0.5.0

## 0.11.1

### Patch Changes

- 919cf06: Add the `rhel-openssl-3.0.x` Prisma `binaryTargets` engine alongside `native`, so the query engine
  binary exists on serverless Linux runtimes (Vercel/Lambda) — without it, a deploy crashes at runtime
  with "query engine binary not found". Local dev still uses `native`.

## 0.11.0

### Minor Changes

- 773471d: Close the autonomous loop: clustered trends are now scored. `listUnscoredTrends` +
  `persistScoresForTrend` (@aioi/database) and `scoreClusteredTrends` (@aioi/ai-service) score
  clustering's unscored trends with the opportunity engine (+ embedding + alert eval); a scheduler
  scoring job runs after clustering. Pipeline is now end-to-end: ingest → cluster → score → alerts/briefs.

## 0.10.1

### Patch Changes

- Updated dependencies [6ae6fa5]
  - @aioi/ai-sdk@0.4.0

## 0.10.0

### Minor Changes

- eddca5d: Per-source ingestion run tracking: each connector pass now records an IngestionRun (status + new-item
  count + timing) via `recordIngestionRun`; `getSourceStats` includes the latest run per source, and the
  /sources page shows a "Last run" column. Best-effort — recording never breaks an ingestion pass.
- 6035103: Add `reembedAllTrends` + a `scripts/reembed-trends.ts` ops command to re-embed all existing trends with
  the currently-configured embedder — run after switching on a real embed model so trends created with
  the Stub become semantically searchable. Batched; a failed batch is logged and skipped.
- 3f93fd8: Connector health surface: `getSourceStats` (per-source signal counts + last-ingested time), an
  admin-gated `sources.stats` tRPC endpoint, and a `/sources` page rendering it with the `@aioi/ui`
  DataTable (source, signals, last ingested, legality tier).

### Patch Changes

- 2126da2: Production-harden real embeddings: LiteLLMEmbedder now requests `dimensions: EMBED_DIM` (guarantees the
  pgvector column matches any model), unit-normalizes each vector, preserves input order, retries
  transient 429/5xx, and fails loudly on a count/dimension mismatch. Embedding backfill in
  `persistScoredTrend` is best-effort (a provider outage no longer fails scoring). Adds a LiteLLM proxy
  routing config so `text-embedding-3-small` + `claude-opus-4-8` resolve. With an OpenAI key, clustering

  - semantic search become genuinely semantic; stub otherwise (CI green).

- Updated dependencies [2126da2]
  - @aioi/ai-sdk@0.3.0

## 0.9.0

### Minor Changes

- da375de: GDPR export/delete (B-023): `exportOrgData` (org-scoped portability, no secrets) + `deleteOrg`
  (right-to-erasure hard delete, cascades) and a `gdpr` tRPC router (export admin-gated; deleteOrg
  owner-only). Also hardens all RLS policies with `NULLIF(current_setting('app.current_org',true),'')`
  so an unset/empty org fails closed instead of throwing `''::uuid` on pooled connections.
- bc95bde: Signal → Trend clustering (B-006): `clusterSignals` (embed + greedy cosine, deterministic offline via
  the StubEmbedder) + `clusterRecentSignals` orchestration, `listUnclusteredSignals`/
  `createTrendFromSignalIds` in `@aioi/database`, and an hourly scheduler clustering job. Connects
  ingestion → trends.

## 0.8.0

### Minor Changes

- 0d328db: Email delivery: new `@aioi/email` (EmailProvider seam — Stub outbox + Resend — plus brief/alert
  templates). The scheduler's daily-brief job now emails each org's members (`listOrgMemberEmails`), via
  the Stub outbox offline and Resend when `RESEND_API_KEY`+`EMAIL_FROM` are set.

## 0.7.0

### Minor Changes

- 2995824: API-key management + auth lookup (B-014 cont.): `createApiKey`/`listApiKeys`/`revokeApiKey` (org-scoped,
  RLS) + a SECURITY DEFINER `app_find_api_key` for the RLS-safe auth-time lookup, wired into the API
  context so `Authorization: Bearer aioi_…` authenticates against the DB. Adds an admin-gated `apikeys` router.

### Patch Changes

- Updated dependencies [eab0a4f]
  - @aioi/billing@0.2.0

## 0.6.0

### Minor Changes

- 5488c28: Billing & entitlements (B-020): new `@aioi/billing` (plans + entitlements + `PlanLimitError`),
  `getPlan`/`setPlan`/`getEntitlements` on Subscription (org-scoped RLS), `createWatchlist` enforces the
  plan's watchlist limit, a `billing` tRPC router (plan/setPlan), and a `/billing` page. Stripe
  checkout/webhooks follow.
- dd23ccb: Scheduler service: `@aioi/scheduler` (BullMQ + cron) with `runIngestionJob` and `runDailyBriefsJob`
  (fan out `generateDailyBrief` over active orgs) as pure, testable job functions + a `startScheduler`
  worker. Adds `listActiveOrgIds` to `@aioi/database` and `main`/`types` to `@aioi/ingestion-service`.

### Patch Changes

- Updated dependencies [5488c28]
  - @aioi/billing@0.1.0

## 0.5.0

### Minor Changes

- c10faf2: Action-plan generators (B-021): `generateActionPlan` in `@aioi/ai-sdk` (Stub + LiteLLM, schema-validated)

  - `@aioi/ai-service` orchestration, `persistActionPlan`/`getActionPlan` with `getTrendBySlug` including
    the plan, an admin-gated `trends.generateActionPlan` mutation, and a plan section on the trend detail
    page. Also adds `main`/`types` to `@aioi/ai-service` so it can be imported.

- 4e6f14d: Daily Brief (B-018): `generateDailyBrief` aggregates top-opportunity trends + the org's
  watchlist/unread-alert counts into a `Brief` (in-app delivered), with `listBriefs`/`getBrief` and open
  tracking (`markBriefOpened`). Adds a `briefs` tRPC router and a `/briefs` list + detail UI. Org-scoped (RLS).

### Patch Changes

- Updated dependencies [c10faf2]
  - @aioi/ai-sdk@0.2.0
  - @aioi/validation@0.2.0

## 0.4.0

### Minor Changes

- 5762d93: Alerts pipeline auto-eval (B-017): `persistScoredTrend` now calls `evaluateTrendAllOrgs`, which uses a
  `SECURITY DEFINER` function (`app_orgs_watching_trend`) for RLS-safe cross-tenant discovery and fires
  per-org notifications for matched alerts. Alerts fire automatically when new scores land.
- 486c37f: Audit logging (B-022): a tRPC middleware on `protectedProcedure` writes an `AuditLog` entry for every
  successful mutation (best-effort), covering all protected mutations cross-cuttingly. Adds
  `writeAuditLog`/`listAuditLogs` (org-scoped, RLS) and an admin-gated `audit.list` endpoint.
- e7d23d8: Semantic trend search (B-019): an `Embedder` in `@aioi/ai-sdk` (Stub + LiteLLM, dim 1536), a pgvector
  `embedding` column + HNSW cosine index on Trend backfilled on persist, `semanticSearchTrends(q)` and a
  public `trends.semanticSearch` endpoint, and a Keyword/Semantic toggle on the trends search.
- c01468e: Trend keyword full-text search (B-019): a STORED generated `searchVector` + GIN index on Trend, a
  `searchTrends(q, limit)` repo (`plainto_tsquery`, ranked by `ts_rank` then recency), a public
  `trends.search` tRPC endpoint, and a search box on the trends page. Semantic (pgvector) search follows.

### Patch Changes

- Updated dependencies [e7d23d8]
  - @aioi/ai-sdk@0.1.0

## 0.3.0

### Minor Changes

- 5d583c8: Alerts engine (B-017): a `Notification` model, org-scoped alert + notification repositories, a pure
  trigger matcher (`NEW_TREND`/`SCORE_CROSSES`), and `evaluateTrendForOrg` that writes in-app
  notifications for matched alerts. Adds `alerts`/`notifications` tRPC routers (protected + RBAC) and RLS
  on `Alert` (EXISTS-via-parent) and `Notification` (direct-org).
- 0634493: Watchlists CRUD (B-016): org-scoped watchlist/item repository (`withOrgContext`), a `watchlists` tRPC
  router (protected + RBAC `watchlists:read`/`:write`), shared Zod schemas, and RLS on `WatchlistItem`
  (EXISTS-via-parent policy). Cross-tenant isolation for watchlists and items proven by integration tests.

### Patch Changes

- Updated dependencies [5d583c8]
- Updated dependencies [0634493]
  - @aioi/validation@0.1.0

## 0.2.0

### Minor Changes

- 8a43b68: Add `bootstrapUser({ clerkId, email, name })`: idempotent first-sign-in provisioning of a user's
  tenant (User + personal Organization + OWNER Membership + personal Workspace) in one transaction that
  sets the org context for the RLS-protected Workspace insert (B-015).

### Patch Changes

- c2a8c88: Runtime connects as a restricted `aioi_app` role via `APP_DATABASE_URL` so RLS enforces (superusers
  bypass it). Migration creates the NOSUPERUSER NOBYPASSRLS role with grants; the client falls back to
  `DATABASE_URL` when `APP_DATABASE_URL` is unset (ADR-0003 / B-027).

## 0.1.0

### Minor Changes

- 1bc6a1b: Add Row-Level Security: `FORCE` RLS + tenant_isolation policies on org-scoped tables, and a
  `withOrgContext(orgId, fn)` helper that sets the org GUC per transaction (fail-closed). Requires the
  app to connect as a non-superuser role to enforce (ADR-0003 / B-027).
