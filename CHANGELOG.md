# Changelog

All notable changes to this project are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · Versioning: [SemVer](https://semver.org/).

This is the **repository** changelog (engineering release notes). The user-facing product
"what's new" Changelog surface (`/changelog`) is a separate product feature (R3). Automated
generation via Changesets will be wired when we start versioned releases; until then this file is
maintained by hand each change, and every PR updates the `[Unreleased]` section.

## [Unreleased]

### Changed
- **deps: stripe 17→22 (major)** — bumped `stripe` in `services/api` + `apps/web`. Stripe 22 pins a new
  API version, so the one breaking change was the typed `apiVersion` literal in `apps/web/app/lib/billing.ts`
  (`2025-02-24.acacia` → `2026-06-24.dahlia`). `services/api` passes no `apiVersion`, so it was unaffected;
  checkout/webhook/portal APIs are unchanged. Full gate green (typecheck/build/lint + 288 tests).
- **deps: dotenv 16→17 (major)** — bumped `dotenv` (dev; used by `packages/database/prisma.config.ts`).
  The `config()` API is unchanged; added `quiet: true` to silence dotenv 17's new promotional startup
  banner so Prisma CLI output stays clean. Verified `prisma db execute`/`generate` + full gate.
- **deps: safe minor/patch bumps** — `msw` 2.15, `prettier` 3.9, `typescript-eslint` 8.63,
  `turbo` 2.10.4, `@types/node` 26.1.1, `@commitlint/cli` 21.2.1 (root); `fastify` 5.10
  (`services/api`); `bullmq` 5.80 (`services/scheduler`). All within-major; full gate green
  (lint/typecheck/build + 288 tests). Consolidates Dependabot's grouped PRs.
- **Docs: Prisma 7 reconcile** — `DEPLOYMENT_GUIDE.md` and `CICD.md` no longer describe the obsolete
  `binaryTargets = ["native","rhel-openssl-3.0.x"]` requirement. Under Prisma 7 the client runs through
  the `@prisma/adapter-pg` driver adapter (no query-engine binary), and connection URLs live in
  `prisma.config.ts` / the runtime adapter rather than `schema.prisma`.
- **Docs: closed roadmap phases 19–27** — added the closing-phase deliverables so documentation matches
  the shipped system: `06-infra/CICD.md`, `08-quality/TESTING_STRATEGY.md`, `06-infra/DEPLOYMENT_GUIDE.md`,
  `06-infra/OBSERVABILITY.md`, `02-architecture/SCALABILITY_PLAN.md`, and `09-process/MILESTONES.md`.
  Marked phases 19–27 ✅ in the ROADMAP, refreshed the IMPLEMENTATION_STATUS one-liner + §7 (alert email
  delivery, RSS feed, and `/changelog` shipped), and recorded the honest test state (194 green; the
  DB-integration tier is exercised against real Postgres+pgvector in CI).
- **Docs: implementation status + ADR-0004** — a new `docs/01-product/IMPLEMENTATION_STATUS.md`
  (what's built, decisions, business model, forward roadmap), `ADR-0004` (billing & entitlements
  architecture), and refreshed ROADMAP current-position + BACKLOG to match the shipped monetization
  wave.
- **Landing page refresh** — a sharper USP hero (“See what to build before it’s a trend”), the
  three differentiation pillars, a feature grid (Golden Quadrant, momentum, build kit, entities, API+MCP,
  digests), a 5-step pipeline, 8 sources, and an API CTA.
- deps: adopt safe major dependency bumps validated by CI — turbo 2.10, @types/node 26, pino 10,
  next 16, lint-staged 17, @commitlint/{cli,config-conventional} 21, zod 4, eslint 10.
- **TypeScript 5→6 (B-026)** — bumped `typescript` to ^6.0.3 across the workspace. TS 6 requires an
  explicit `rootDir` when emitting (error TS5011), so each emitting package/service tsconfig now sets
  `rootDir`/`outDir` locally (the shared preset can't — extends-relative paths anchor to the preset).
  Also turned off core `no-undef` in the shared ESLint config (typescript-eslint 8.x no longer disables
  it under TS 6; `tsc` already resolves undefined identifiers). Typecheck/lint/build/tests all green.

### Fixed
- **CSS syntax fix** — a merge-introduced unbalanced brace in `globals.css` (after the referrals
  block) had silently broken every rule after it (onboarding, referrals, report). Restored the
  balance; those pages now style correctly again.
- **Scheduled data refresh** — `scripts/demo-data.ts` imported `@aioi/database` by package name, which
  isn't linked into the repo-root `node_modules`, so it failed to resolve under `tsx` in CI
  (`Cannot find module '@aioi/database'`). Switched to a relative import, matching the service imports.

### Added
- **Langfuse LLM tracing (B-007)** — a provider-agnostic tracing seam in `@aioi/ai-sdk`
  (`Tracer`/`NoopTracer`/`LangfuseTracer` + `getTracer`) wraps every real model call (scoring, action
  plans, entity extraction) in a generation span with model, input, output, latency, and token usage.
  Activates only when `LANGFUSE_PUBLIC_KEY` + `LANGFUSE_SECRET_KEY` are set; a `NoopTracer` otherwise, so
  CI stays green with zero keys. The client is imported lazily (no-keys path never loads the dep) and
  tracing is best-effort. Closes the last keys-gated observability gap.
- **Prisma 5→7 (B-025)** — adopted Prisma 7 in `@aioi/database`. Prisma 7 runs queries through a
  **driver adapter** (`@prisma/adapter-pg` over node-postgres) instead of a bundled query-engine binary,
  and connection URLs move out of `schema.prisma`: the CLI/`migrate` URL now lives in a new
  `packages/database/prisma.config.ts`, and the runtime client passes `APP_DATABASE_URL` (the restricted
  `aioi_app` role) to the adapter — RLS still enforced (ADR-0003). Removing `binaryTargets` also drops the
  old `rhel-openssl-3.0.x` serverless-binary footgun. Validated end-to-end: `migrate deploy` + **62
  DB-integration tests (incl. RLS fail-closed) green against live Postgres+pgvector**. `@prisma/client`
  imports and all repositories are unchanged.
- **Source observability on `/sources`** — the full connector catalog with a **data-driven** status
  per source: **Live** (count), **Failing** (with the connector's actual error), **Idle**, or **Not set
  up**. Failed ingestion passes are now recorded (`recordFailedIngestionRun`; error surfaced via
  `getLatestRuns`), so a configured-but-broken source (e.g. an expired token) shows *why* it produced
  nothing instead of silently reading zero. Status no longer guesses the web app's env (the cron owns
  the keys).
- **Report PDF export** — the State-of-AI report (`/report`) gains a **Save as PDF** button and a
  print-optimized stylesheet (hides app chrome, renders on white, avoids awkward page breaks) plus a
  dateline, so teams can export a clean, dated, shareable PDF. Dependency-free (browser print-to-PDF).
- **HN "Who is hiring?" source** — a 10th connector reading the latest monthly Who-is-hiring
  thread via the official, keyless HN Algolia API and keeping the AI/ML job posts (hiring is a
  leading indicator of demand). Posts flow through the normal clustering, adding demand/momentum to
  the matching trend. New `hnhiring` connector + `runHnHiringIngestion`.
- **Referral loop** (`/referrals`) — each org gets a shareable referral code; a new org can apply
  a code and the referrer sees how many teams joined via their link. New `Organization.referralCode`
  / `referredByCode` (+ migration) and `getOrCreateReferralCode` / `getReferralStats` /
  `applyReferralCode` helpers, with a copy-link + apply-code page. Auto-capture at signup is a follow-on.
- **Personalized weekly digest** — a per-org weekly email of movement in *that org's* watched
  trends (opportunity + momentum arrows) and new alert matches, distinct from the generic
  newsletter. New watchlist-digest email builder + `scripts/weekly-digest.ts` on a weekly
  `weekly-digest.yml` workflow (gated on `RESEND_API_KEY`, dry-run supported). Composed from existing
  helpers — no migration. Orgs with no watched trends are skipped.
- **Get-started checklist** (`/start`) — a 4-step onboarding checklist (watchlist → alert → API
  key → team digest) whose done-state is derived live from the org's data, with a progress bar. An
  activation surface toward the north-star; linked from the nav + sitemap.
- **Business tier** — a 4th plan (100 seats, 500k/day API, $299/mo · $2,990/yr) above Team,
  following the ADR-0004 entitlements pattern. New `PLAN_ORDER` / `planRank`; `/billing` offers an
  upgrade to every plan ranked above the current one; the pricing page renders four tiers. Stripe
  price ids: `STRIPE_PRICE_BUSINESS` / `STRIPE_PRICE_BUSINESS_ANNUAL`.
- **PyPI source** — a 9th connector ingesting the newest AI-relevant packages from the official,
  keyless PyPI RSS feed (a brand-new AI package is a leading indicator; PyPI has no popularity search,
  so we filter the newest-packages feed by AI keywords). New `pypi` connector + `runPypiIngestion`,
  wired into the refresh pipeline; appears in the source filter automatically.

- **Alert email delivery** — `EMAIL`-channel alerts now actually email: a new
  `Notification.emailedAt` column (+ migration), `listPendingEmailNotifications` /
  `markNotificationsEmailed` helpers, an alert-email builder in the notification service, and a
  `scripts/deliver-alerts.ts` job on an hourly `deliver-alerts.yml` workflow (gated on
  `RESEND_API_KEY`, dry-run supported). Emails deep-link to the trend; best-effort + idempotent.
- **Public "What's new" page** (`/changelog`) — curated, user-facing product updates grouped by
  month with New/Improved/Fixed tags (a separate surface from this engineering changelog). Linked
  from the nav + sitemap; points to the RSS feed.
- **Public RSS feed** (`/feed.xml`) — an RSS 2.0 feed of the newest scored opportunities (title,
  link, opportunity score, build idea, `pubDate`) from a new `listTrendFeed` query, with feed-reader
  autodiscovery in the document head. A distribution channel for readers + automation alongside the
  API/MCP.
- **Related opportunities** on the trend page — a new `relatedTrends` query finds the
  embedding-nearest trends (pgvector `<=>`, excluding itself); the trend detail "Related" section
  now shows shared-entity matches first and fills with semantically-similar trends, so even
  sparsely-tagged trends surface relevant neighbours.

- **API usage history sparkline** on `/billing` — a 14-day SVG sparkline of daily API requests
  (summed across the org's keys) with the running total, from a new `getApiUsageHistory` helper that
  zero-fills the existing per-day `ApiKeyUsage` rows. No new retention needed.
- **Annual billing** — paid plans can be billed annually at 10× the monthly rate (two months
  free). Shared `PLAN_PRICING` + `monthlyEquivalent` in `@aioi/billing`, a monthly/annual toggle on
  the pricing and billing pages, and interval-aware Stripe checkout (`STRIPE_PRICE_PRO_ANNUAL` /
  `STRIPE_PRICE_TEAM_ANNUAL`; the interval is threaded through `CheckoutInput`). Entitlements don't
  change by interval.
- **tRPC `trends.semanticSearch` gated on entitlements** — now a `protectedProcedure` requiring
  `search:read` and a plan that grants `semanticSearch` (Pro/Team), returning `FORBIDDEN`
  otherwise. Closes the last ungated semantic-search surface (the web `/trends` flow was already gated).
- **Usage panel on `/billing`** — usage-vs-limit meters for watchlists, alerts, team seats, and
  the busiest API key today, read live against the plan's entitlements (amber at ≥80%, red at the
  limit; unlimited shows a running count). Backed by new `countWatchlists` / `countAlerts` helpers.

- **Team tier + seat enforcement** — a new **TEAM** plan (25 seats, 200k/day API) alongside
  Free/Pro. Every plan gains a `maxSeats` entitlement (Free 1, Pro 3, Team 25), enforced at
  `inviteMember` (throws `PlanLimitError`, surfaced as an upgrade notice). Stripe checkout is now
  plan-aware — Pro/Team price ids, with the plan carried in subscription metadata so the webhook
  needs no price→plan table. Pricing shows three tiers; `/billing` offers per-plan upgrades; the
  team page shows seat usage and blocks invites once full.
- **Entitlement enforcement at the write paths** — `createAlert` now enforces the plan's
  `maxAlerts` (Free 10) the way `createWatchlist` already enforced `maxWatchlists`, throwing
  `PlanLimitError`; semantic search on `/trends` is gated on the `semanticSearch` entitlement (Free
  falls back to keyword search with an upgrade prompt). Blocked creates redirect back with an inline
  “upgrade to Pro” banner instead of surfacing an error.
- **Stripe checkout & webhook** — self-serve upgrades on `/billing`: *Upgrade to Pro* opens Stripe
  Checkout (or applies Pro directly in test mode), a signature-verified webhook at
  `/api/stripe/webhook` is the source of truth for plan changes (pure, unit-tested event→plan
  helpers in `@aioi/billing`; `applyStripeSubscription` persists ids + audit), and cancel/manage go
  through the Stripe Billing Portal. Falls back to the offline Stub when Stripe env is unset.
- **Public pricing page** (`/pricing`) — Free vs Pro tiers rendered from the live plan
  entitlements (single source of truth in `@aioi/billing`): unlimited watchlists/alerts, semantic
  search, and a 50,000/day API quota on Pro. Comparison + "included in every plan" + FAQ; linked
  from the nav, the landing page, and the sitemap.
- **Plan-aware API quota** — the daily API rate limit now derives from the org plan's entitlements
  (Free 1,000/day, Pro 50,000/day) via a new `apiDailyQuota` entitlement, instead of a fixed constant.
  `/team` shows the current plan + quota; `X-RateLimit-Limit` reflects it.
- **API rate limiting** — authenticated API keys count against a **1,000/day quota** (DB-backed
  `ApiKeyUsage` counter): responses carry `X-RateLimit-Limit`/`X-RateLimit-Remaining`, and an exhausted
  key gets a `429 rate_limit_exceeded`. Today's usage is shown per key on `/team`. New `recordApiKeyUsage`
  / `getApiKeyUsageToday`.
- **State of AI Opportunities report** — a public `/report` snapshot composing the top opportunities,
  the Golden-Quadrant distribution, momentum leaders, most-tracked entities, and the source breakdown
  into one shareable, SEO-indexed page (in the sitemap + a homepage feature card).
- **Weekly newsletter send** — format the top opportunities as an email (HTML + plain-text, with a
  `List-Unsubscribe` header) and send to every active subscriber via Resend, each with a personal
  unsubscribe link. New `buildNewsletterHtml`/`buildNewsletterText`/`sendEmail` + `scripts/newsletter.ts`
  + a weekly `newsletter.yml` workflow (gated on `RESEND_API_KEY`; dry-run supported).
- **Newsletter signup** — a homepage form to subscribe to a free weekly digest (new `Subscriber`
  model + idempotent, case-insensitive `subscribe`/`unsubscribe`/`listActiveSubscribers`), and a
  token-based `/unsubscribe` page. The top-of-funnel list starts building now; the weekly send follows.
- **API keys** — manage read-API keys on `/team` (create with a one-time secret reveal, list, revoke;
  RBAC-gated). The public API accepts an optional `Authorization: Bearer aioi_…` key that raises the
  per-request limit cap (anonymous ≤25, authenticated ≤100) and records `lastUsedAt`. New `touchApiKey`.
- **Social share images** — a dynamic, branded Open Graph image per trend (title + opportunity
  score + build idea) and for the homepage (generated with `next/og`), so shared links render a rich
  card on Twitter/Slack/LinkedIn/iMessage. New `getTrendOg` query.
- **Per-org digest config** — a "Digest delivery" section on `/team` to connect a Slack/Discord
  incoming webhook and toggle the daily digest per organization (new `OrgIntegration` model). RBAC-gated,
  audited, webhook host-validated; the URL is never reflected back to the page. The cron delivers to each
  org's configured webhook (env remains the fallback).
- **npm source** — an 8th connector ingesting the top AI packages by popularity from the official,
  keyless npm registry search API (package adoption is a leading indicator). New `fetchPackages` +
  `runNpmIngestion`, wired into the refresh pipeline; appears in the source filter automatically.
- **MCP server** (`@aioi/mcp-server`) — a Model Context Protocol server (stdio) exposing the platform
  as tools: `search_trends`, `get_trend`, `list_build_now_opportunities`. A coding agent (Claude Desktop,
  Cursor, Claude Code) can query live AI opportunities. Wraps the public API over HTTP (`AIOI_API_URL`) —
  no database credentials required.
- **Public read API (v1)** — `GET /api/v1` (self-documenting), `/api/v1/trends` (scored list, with
  `limit`/`source`/`sort`), `/api/v1/trends/{slug}` (scores, momentum, entities, build plan), and
  `/api/v1/opportunities` (the Golden-Quadrant "build now" list). Consistent JSON envelope + CORS —
  programmatic access to the opportunity data, and the foundation for an MCP server.
- **Slack/Discord digest delivery** — the daily brief is formatted as a Slack Block Kit / Discord
  message and posted to a webhook (best-effort, opt-in). New `formatSlackDigest`/`formatDiscordDigest`/
  `deliverDigest` in the notification service; the refresh cron delivers when `SLACK_WEBHOOK_URL` /
  `DISCORD_WEBHOOK_URL` is configured.
- **Team members & roles** — a `/team` page to invite teammates by email, assign roles (owner/admin/
  member/billing/viewer), and remove them; every mutation is RBAC-gated (owners & admins only) and
  audit-logged. Invited-but-not-signed-in users show as `pending`. New members data layer +
  `getDevMembership` for the caller's role.
- **arXiv source** — a 7th connector ingesting the latest cs.AI/cs.LG/cs.CL submissions from the
  official, keyless arXiv Atom API (a leading indicator — research precedes products). New `fetchPapers`
  + `runArxivIngestion`, wired into the refresh pipeline; appears in the source filter automatically.
- **Public SEO pages** — a dynamic `sitemap.xml` (all scored trends + entities + static routes) and
  `robots.txt`, per-page metadata (title template, description, canonical, Open Graph/Twitter) for
  `/trends/[slug]` and `/entities/[id]`, JSON-LD on trend pages, and `metadataBase` in the root layout —
  the compounding organic-traffic engine. New `listTrendSlugs`/`getTrendSeo`/`getEntitySeo` + `getSiteUrl`.
- **Build kit (scaffold export)** — a trend's action plan is assembled into a rigorous, ready-to-paste
  scaffold prompt for an AI coding agent (Claude Code / Cursor / v0): a full engineering brief (role,
  requirements, coding standards, security, performance, UX, definition of done, decision priority) with
  copy + download on the detail page. Deterministic `buildScaffoldPrompt` (@aioi/shared) — the last mile
  of "signal → shipped".
- **Backfill re-score workflow** — a manual `backfill-rescore` GitHub Action (Actions tab → Run
  workflow) to run the opt-in re-score in batches with a dry-run estimate toggle, instead of locally.
- **Opt-in backfill re-score** — `pnpm rescore [batch]` upgrades existing (Stub-era) trend scores to
  the configured real model, overwriting in place (same rubric → no duplicate rows). Batched and
  queue-rotating (stalest first) so a full backfill runs incrementally; refuses to run on the Stub;
  `RESCORE_DRY=1` estimates the model-call count without spending. New `rescoreTrends` +
  `listTrendsForRescore` / `touchTrend` / `countScoredTrends`; shared `toTrendLike` helper.
- **Demand mining (Golden Quadrant)** — detect demand-expressing signals ("Ask HN", "is there a
  tool for…", "I wish there was…", "alternative to…") and blend them into the quadrant's demand axis,
  so articulated demand lifts a trend toward "build now". Build-now rows show an "N wanted" tag. New
  `mineDemand` + `getTrendDemandHits`.
- **The Golden Quadrant** — a `/quadrant` scatter plotting every scored trend on demand (business
  viability) × supply (competition), highlighting the high-demand/low-supply "build now" region, with a
  ranked build-now list. First cut of the USP demand×supply view (new `listTrendsQuadrant`).
- **Trend momentum** — an append-only `TrendSnapshot` history (one point per pipeline run) powers a
  signal-velocity + 7-day delta, shown as a sparkline on every trend card and a momentum panel
  (Accelerating / Steady / Cooling) on the detail page. Starts accruing on the next cron run. New
  `recordTrendSnapshots` + `getTrendMomentumMap`, `Sparkline`/`MomentumTag` components.
- **Compare from the browse grid** — a "Compare" checkbox on each trend card + a floating bar
  (select up to 4) that links to `/trends/compare`, so you can compare any trends while browsing, not
  just ones on a watchlist.
- **Trend comparison** — `/trends/compare?slugs=…` shows up to 4 trends' 10-dimension scorecards side
  by side, highlighting the best value per row (lowest for inverted dims). Entered via a "Compare N
  trends" link on any watchlist with ≥2 tracked trends.
- **Trend ↔ entity cross-linking + related trends** — the trend detail now shows its extracted
  entities (chips linking to /entities) and a "Related trends" section (trends sharing entities, ranked
  by shared-entity count then opportunity). Deterministic — works from the entity links, no embeddings.
  New `getTrendEntities` + `getRelatedTrends`.
- **Trends CSV/JSON export** — `/trends/export` streams the current filtered/searched view (title,
  status, all 10 dimensions, top idea, url) as CSV or JSON; "Export CSV / JSON" links on the page.
- **Polish pass** — loading-skeleton fallbacks for /trends and /entities, a global `:focus-visible`
  outline for keyboard users (reduced-motion aware), and a11y labels.
- **LLM-powered entity extraction (optional)** — `LLMProvider.extractEntities` + `extractEntitiesForTrends({ useLlm })`
  discover entities beyond the curated dictionary (new startups/models); off by default, opt-in via
  `AIOI_ENTITY_LLM`. Verified live (found "InstantVideos.org" not in the dictionary).
- **Entities directory** — extract the AI companies/models/tools/protocols that recur across trends
  (curated keyword dictionary, deterministic, in the pipeline) and browse them at `/entities`, ranked by
  how many trends mention them; each entity links to those trends. New `entities` data layer +
  `extractEntitiesForTrends` (wired into the cron) + `/entities` and `/entities/[id]` pages + nav.
- **Notifications page polish** — each notification now links to the trend that matched (with its
  opportunity score), shows a relative timestamp ("1m ago"), and unread vs read is visually distinct
  (accent border vs dimmed).
- **"Watching" filter on the trends page** — a toggle to show only the trends on your watchlist.
  `listTrendsPage` gains an optional `ids` restriction (composes with source/status/sort/pagination).
- **One-click "Watch" toggle on trend cards** — add/remove a trend to your watchlist right from the
  browse grid (creates a default watchlist on first use); the card stays fully clickable via a stretched
  link. New `getOrCreatePrimaryWatchlist` / `listWatchedTargetIds` / `removeWatchlistItemByTarget`.
- **Richer daily briefs (+ generated in the cron)** — each top-opportunity trend in the brief now
  shows its score band + build-idea teaser (from its action plan), and the scheduled refresh generates
  a brief for the demo tenant so `/briefs` is populated on the live site.
- **Watchlists: track trends end-to-end** — an "Add to watchlist" control on the trend page (pick a
  list, one click), and watchlist items now render the trend's title + opportunity score + link instead
  of a raw id (`getTrendsByIds`). Closes browse → track → alert. (Create/alerts/notifications already existed.)
- **Public landing page** — `/` is now a real homepage (was a redirect): hero + CTA into /trends,
  live stats (trends/signals/sources), the top opportunities right now, a four-step "how it works"
  pipeline walkthrough, and the six official sources. Responsive + theme-aware.
- **Rich resource cards for every source** — GitHub (stars/forks/language, owner, homepage + repo,
  topics), YouTube (description, channel link, watch link), and Hugging Face (likes/downloads, pipeline,
  author, tags) now render a full detail card like Product Hunt. One reusable renderer maps each source's
  raw payload to a shared view.
- **Rich Product Hunt items** — the connector now captures website, makers, topics, thumbnail, and
  comments; the trend detail renders a full card per launch: tagline (what it is), description (the
  problem), makers with profile links (who built it), product + Product Hunt links, and topic chips.
- **Auto action-plan generation** — the pipeline now generates + persists an action plan (SaaS/API/
  content ideas, MVP, pricing, domains, keywords, tech stack) for the top-scoring trends without one,
  completing ingest → cluster → score → **plan**. Idempotent (skips already-planned), Stub-or-real via
  the AI SDK, wired into the scheduled refresh. New `generateActionPlansForTopTrends()`.
- **Action-plan teaser on trend cards** — browse cards now show a "💡 Build idea" block (top SaaS
  idea + product-name chips) for trends that have a generated action plan; `listTrendsPage` includes it.
- **Richer trend detail: sources & links + scoring rationale** — the trend page now lists the source
  items backing it (badge + external link + date) via `getTrendResources()`, a "backed by N signals
  across M sources" line, and per-dimension scoring rationales.
- **Trends browse: filter by source + status, sort by any dimension, numbered pagination** —
  the trends page gains source radio buttons (only connectors with data), a status filter, a sort
  selector (Newest / highest of any score dimension), and numbered pagination. New `listTrendsPage()`
  in `@aioi/database`; a client `TrendControls` updates the URL; responsive.
- **All sources in the refresh + faster cadence + responsive UI** — the scheduled refresh now runs
  every **3h** (was 6h), ingests **all six sources** (Reddit/Product Hunt/YouTube activate when their
  key secret is set; HN/GitHub/HF always), and `demo-data.ts` runs them all resiliently. The web app is
  now **mobile + tablet responsive** (device-width viewport, nav collapses to a scrollable row ≤720px,
  fluid trend grid, tighter mobile padding).
- **Direct-provider AI (no gateway) + real-score cron** — `@aioi/ai-sdk` now sends a bearer token
  from `AIOI_LLM_API_KEY`, so `LITELLM_BASE_URL=https://api.openai.com/v1` calls OpenAI directly (real
  embeddings + scoring) in serverless/CI. The refresh-data workflow uses it: add an `OPENAI_API_KEY`
  secret → the scheduled refresh scores for real, fully autonomous. Verified live. 2 tests.
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
- **Fix: pipeline crash on emoji/control chars in source text** — a title truncated mid-emoji left a
  lone surrogate that made Prisma throw `unexpected end of hex escape` on `trend.create` (surfaced once
  YouTube ingestion turned on). New `sanitizeText()` in `@aioi/shared`, applied on trend + signal writes.
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
