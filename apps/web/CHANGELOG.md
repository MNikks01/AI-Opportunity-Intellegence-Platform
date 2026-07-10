# @aioi/web

## 0.22.0

### Minor Changes

- a4f5de6: Annual billing option. Paid plans can now be billed annually at 10× the monthly rate (two months
  free): shared PLAN_PRICING + monthlyEquivalent in @aioi/billing, a monthly/annual toggle on the
  pricing and billing pages, and interval-aware Stripe checkout (STRIPE_PRICE_*_ANNUAL price ids;
  interval threaded through CheckoutInput). Entitlements are unchanged by interval.
- 97f8bf4: Business tier — a 4th plan (100 seats, 500k/day API, $299/mo) rounding out the ladder, following the
  ADR-0004 entitlements pattern. New PLAN_ORDER / planRank; the billing page offers an upgrade to every
  plan above the current one; pricing renders four tiers. SSO/enterprise controls are a follow-on.
- 38f4aa5: Public "What's new" changelog page. A new `/changelog` renders curated, product-facing release
  entries (grouped by month, New/Improved/Fixed tags), distinct from the engineering CHANGELOG. Linked
  from the nav and sitemap, with a pointer to the RSS feed.
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
- 85c3423: Onboarding / activation checklist. A new `/start` "Get started" page shows a 4-step setup checklist
  (create a watchlist, set an alert, create an API key, connect a team digest) with each step's done
  state derived live from the org's data and a progress bar. Linked from the nav + sitemap; drives
  activation toward the north-star (Weekly Acted-On Opportunities).
- 9d6d986: Referral loop. Each org gets a shareable referral code (Organization.referralCode); a new org can
  apply a code (referredByCode) and the referrer sees how many teams joined via their link. New
  getOrCreateReferralCode / getReferralStats / applyReferralCode helpers + a /referrals page (link,
  copy, stats, apply form). Full auto-capture at signup is a follow-on.
- 7daf15f: Related opportunities on the trend page. New relatedTrends query finds embedding-nearest trends
  (pgvector, excluding the trend itself); the trend detail "Related" section now shows shared-entity
  matches first and fills with semantically-similar trends, so even sparsely-tagged trends surface
  relevant neighbours.
- e813087: Report PDF export. The State-of-AI report (/report) now has a "Save as PDF" button and a
  print-optimized stylesheet (@media print hides the app chrome, renders on white, avoids awkward page
  breaks) plus a dateline, so teams can export a clean, dated, shareable PDF. Dependency-free
  (browser print-to-PDF).
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

- 509db1d: HN "Who is hiring?" job source (10th source). Reads the latest monthly Who-is-hiring thread via the
  official keyless HN Algolia API and keeps AI/ML job posts — hiring is a leading indicator of demand,
  and these flow through the normal clustering to add demand/momentum to the matching trend. New
  hnhiring connector + runHnHiringIngestion, wired into the refresh pipeline.
- 7686759: PyPI source — a 9th connector. Reads the official, keyless PyPI newest-packages RSS feed and keeps
  the AI-relevant packages (a brand-new AI package is a leading indicator). New pypi connector +
  runPypiIngestion, wired into the refresh pipeline; appears in the source filter automatically.
- Updated dependencies [eb1fc88]
- Updated dependencies [a4f5de6]
- Updated dependencies [97f8bf4]
- Updated dependencies [e6dd752]
- Updated dependencies [6a8f4d4]
- Updated dependencies [b80c3c5]
- Updated dependencies [9d6d986]
- Updated dependencies [7daf15f]
- Updated dependencies [8a17bc7]
- Updated dependencies [4011ff2]
- Updated dependencies [7edad2e]
- Updated dependencies [d3eec43]
- Updated dependencies [7d8b33c]
  - @aioi/database@0.24.0
  - @aioi/billing@0.4.0

## 0.21.0

### Minor Changes

- ea8c984: Public `/pricing` page — Free vs Pro tiers driven by the real plan entitlements (unlimited
  watchlists/alerts, semantic search, 50,000/day API quota on Pro), with a comparison, an
  "included in every plan" list, and FAQ. Added to nav + sitemap; `@aioi/database` now re-exports
  the billing entitlements.

### Patch Changes

- Updated dependencies [ea8c984]
  - @aioi/database@0.23.1

## 0.20.0

### Minor Changes

- d122844: API rate limiting: authenticated API keys now count against a 1,000/day quota (DB-backed), return
  X-RateLimit-* headers, and get a 429 when exhausted. Usage shown per key on /team. New ApiKeyUsage model

  - recordApiKeyUsage/getApiKeyUsageToday.

- 382081c: State of AI Opportunities report: a public /report page composing top opportunities, the Golden-Quadrant
  distribution, momentum leaders, most-tracked entities, and the source breakdown into one shareable,
  SEO-indexed snapshot. Added to the sitemap + a homepage feature card.

### Patch Changes

- 30ddabc: Plan-aware API quota: the daily API rate limit now comes from the org plan's entitlements (Free 1,000/day,
  Pro 50,000/day) instead of a constant. New apiDailyQuota entitlement; /team shows the plan + quota.
- Updated dependencies [d122844]
  - @aioi/database@0.23.0

## 0.19.0

### Minor Changes

- a890f98: API keys: manage read-API keys on /team (create with one-time reveal, list, revoke) and optional
  Bearer auth on /api/v1 that raises the limit cap (anon ≤25, authed ≤100) and records usage. New
  touchApiKey; reuses the existing ApiKey infra.
- 1009efc: Newsletter subscriber capture: a Subscriber model + subscribe/unsubscribe/list data layer, a homepage
  signup form, and a token-based /unsubscribe page. The top-of-funnel list starts building now; the weekly
  send follows.
- a8f0a49: Dynamic Open Graph images: a branded social-share card per trend (title + opportunity score + build
  idea) and for the homepage, generated with next/og. Improves click-through when links are shared. New
  getTrendOg query.

### Patch Changes

- Updated dependencies [a890f98]
- Updated dependencies [1009efc]
- Updated dependencies [a8f0a49]
  - @aioi/database@0.22.0

## 0.18.0

### Minor Changes

- 149dd8d: Per-org digest config: an OrgIntegration model + a "Digest delivery" section on /team to connect a
  Slack/Discord incoming webhook and toggle the daily digest. RBAC-gated, audited, webhook host-validated;
  the cron delivers to each org's configured webhook (env is the fallback). New getOrgIntegration/setOrgIntegration.

### Patch Changes

- 1c0b0f7: Landing page refresh: sharper USP hero, the three differentiation pillars, a feature grid (Golden
  Quadrant, momentum, build kit, entities, API+MCP, digests), a 5-step pipeline, 8 sources, and API CTA.
- Updated dependencies [149dd8d]
  - @aioi/database@0.21.0

## 0.17.0

### Minor Changes

- b2aa6b6: Public read API v1: GET /api/v1 (self-documenting index), /api/v1/trends (scored list),
  /api/v1/trends/{slug} (scores, momentum, entities, build plan), and /api/v1/opportunities (the
  Golden-Quadrant "build now" list). JSON envelope + permissive CORS. The foundation for the MCP server.

## 0.16.0

### Minor Changes

- 89fa03c: Public SEO pages: a dynamic sitemap.xml (all scored trends + entities + static routes) and robots.txt,
  per-page metadata (title template, description, canonical, Open Graph/Twitter) for /trends/[slug] and
  /entities/[id], JSON-LD on trend pages, and metadataBase in the root layout. New `listTrendSlugs` /
  `getTrendSeo` / `getEntitySeo` + a `getSiteUrl` helper (NEXT_PUBLIC_SITE_URL for the canonical domain).
- f6907ac: Team members & roles: a /team page to invite members by email, assign roles, and remove them — every
  mutation RBAC-gated (owners/admins) and audit-logged. New members data layer (listMembers, inviteMember,
  updateMemberRole, removeMember, canManageMembers) + getDevMembership (current user's role).

### Patch Changes

- Updated dependencies [89fa03c]
- Updated dependencies [f6907ac]
  - @aioi/database@0.20.0

## 0.15.0

### Minor Changes

- 746979c: Build kit: on a trend's detail page, assemble its action plan into a rigorous, ready-to-paste scaffold
  prompt for an AI coding agent (Claude Code / Cursor / v0) — a full engineering brief (role, task,
  requirements, coding standards, security, performance, UX, definition of done, decision priority) with
  copy + download. New deterministic `buildScaffoldPrompt` in @aioi/shared. The last mile of "signal → shipped".

### Patch Changes

- Updated dependencies [2d70e24]
- Updated dependencies [746979c]
  - @aioi/database@0.19.0
  - @aioi/shared@0.2.0
  - @aioi/ui@0.4.1

## 0.14.0

### Minor Changes

- dd48ae9: Demand mining for the Golden Quadrant: detect demand-expressing signals ("Ask HN", "is there a tool
  for…", "I wish there was…", "alternative to…") and blend them into the quadrant's demand axis, so
  articulated demand lifts a trend toward "build now". New `mineDemand` + `getTrendDemandHits`.

### Patch Changes

- Updated dependencies [dd48ae9]
  - @aioi/database@0.18.0

## 0.13.0

### Minor Changes

- da8a1f2: Compare from the browse grid: a per-card "Compare" checkbox + a floating bar (client selection, up to 4)
  that links to /trends/compare — compare any trends, not just watchlist ones.
- e91c90b: The Golden Quadrant: a /quadrant page plotting every scored trend on demand (business) × supply
  (competition), highlighting the high-demand/low-supply "build now" region, plus a ranked build-now list.
  New `listTrendsQuadrant`. First cut of the USP demand×supply view; demand axis will fold in mined signals.
- dc47b88: Trend momentum: append-only TrendSnapshot history (one point per pipeline run) → a signal-count
  velocity + 7-day delta shown as a sparkline on trend cards and a momentum panel on the detail page.
  New `recordTrendSnapshots` (wired into the cron) + `getTrendMomentumMap`; `Sparkline`/`MomentumTag` UI.

### Patch Changes

- Updated dependencies [e91c90b]
- Updated dependencies [dc47b88]
  - @aioi/database@0.17.0
  - @aioi/ui@0.4.0

## 0.12.0

### Minor Changes

- 066af5f: Trend comparison: /trends/compare?slugs=… renders up to 4 trends' scorecards side by side with the best
  value per dimension highlighted (inverted dims pick the lowest). Entered via a "Compare N trends" link on
  a watchlist.

## 0.11.0

### Minor Changes

- 13a4d82: Trend ↔ entity cross-linking on the trend detail: an "Entities" chip row (linked to /entities), and a
  "Related trends" section (trends sharing entities, by shared count then opportunity). New
  `getTrendEntities` + `getRelatedTrends`.

### Patch Changes

- Updated dependencies [13a4d82]
  - @aioi/database@0.16.0

## 0.10.0

### Minor Changes

- bdc16f0: Three additions: (1) CSV/JSON export of the trends view; (2) a polish pass — loading skeletons, keyboard
  focus visibility, a11y touches; (3) optional LLM-powered entity extraction for open-ended discovery
  beyond the curated dictionary (`LLMProvider.extractEntities`, `extractEntitiesForTrends({ useLlm })`).

### Patch Changes

- Updated dependencies [bdc16f0]
  - @aioi/validation@0.3.0
  - @aioi/database@0.15.1

## 0.9.0

### Minor Changes

- 20f71a4: Entities directory: extract the recurring AI companies/models/tools/protocols from trends (curated
  keyword dictionary, in the pipeline) and browse them at /entities → each links to the trends it appears
  in. New `entities` data layer, `extractEntities`/`extractEntitiesForTrends`, and two pages + nav.

### Patch Changes

- Updated dependencies [20f71a4]
  - @aioi/database@0.15.0

## 0.8.1

### Patch Changes

- 99e036c: Polish the notifications page: each notification links to the trend that matched (with its opportunity
  score), shows a relative timestamp, and read/unread state is visually distinct.

## 0.8.0

### Minor Changes

- 0fc7986: One-click "Watch" toggle on trend cards. `TrendCard` gains an `action` slot rendered above a stretched
  card link (so a button stays clickable). New data helpers: `getOrCreatePrimaryWatchlist`,
  `listWatchedTargetIds`, `removeWatchlistItemByTarget`.
- 25880d3: A "Watching" filter on the trends page shows only trends on your watchlist. `listTrendsPage` gains an
  optional `ids` restriction (empty → empty page); the browse controls add a toggle.

### Patch Changes

- Updated dependencies [0fc7986]
- Updated dependencies [25880d3]
  - @aioi/database@0.14.1
  - @aioi/ui@0.3.0

## 0.7.0

### Minor Changes

- 3e558bb: Public landing page at `/` (was a redirect to /trends): hero + CTA, live stats, top-opportunity trends,
  a "how it works" pipeline walkthrough, and the six official sources.
- 12c676f: Close the browse→track loop: an "Add to watchlist" control on the trend page, and watchlist items now
  resolve to the trend's title + opportunity score + link (via `getTrendsByIds`) instead of a raw id.

### Patch Changes

- Updated dependencies [e7f0515]
- Updated dependencies [0a324c5]
- Updated dependencies [4e604ca]
- Updated dependencies [12c676f]
  - @aioi/database@0.14.0
  - @aioi/ui@0.2.1

## 0.6.8

### Patch Changes

- Updated dependencies [fbccec0]
- Updated dependencies [05b9e7f]
  - @aioi/database@0.13.0
  - @aioi/ui@0.2.0

## 0.6.7

### Patch Changes

- Updated dependencies [ed24c47]
  - @aioi/database@0.12.0

## 0.6.6

### Patch Changes

- Updated dependencies [aa401cc]
  - @aioi/shared@0.1.0
  - @aioi/database@0.11.3
  - @aioi/ui@0.1.1

## 0.6.5

### Patch Changes

- @aioi/database@0.11.2

## 0.6.4

### Patch Changes

- Updated dependencies [919cf06]
  - @aioi/database@0.11.1

## 0.6.3

### Patch Changes

- b3ad6df: Fix Clerk auth on Next.js 16: rename the request middleware `middleware.ts` → `proxy.ts` (Next 16's new
  convention) so `clerkMiddleware()` is detected — resolves "auth() was called but Clerk can't detect
  usage of clerkMiddleware()" and the resulting 404. Also switch the header `<SignInButton>` to Clerk's
  default button (the custom child tripped a "multiple children" error).

## 0.6.2

### Patch Changes

- Updated dependencies [773471d]
  - @aioi/database@0.11.0

## 0.6.1

### Patch Changes

- @aioi/database@0.10.1

## 0.6.0

### Minor Changes

- 3f93fd8: Connector health surface: `getSourceStats` (per-source signal counts + last-ingested time), an
  admin-gated `sources.stats` tRPC endpoint, and a `/sources` page rendering it with the `@aioi/ui`
  DataTable (source, signals, last ingested, legality tier).

### Patch Changes

- eddca5d: Per-source ingestion run tracking: each connector pass now records an IngestionRun (status + new-item
  count + timing) via `recordIngestionRun`; `getSourceStats` includes the latest run per source, and the
  /sources page shows a "Last run" column. Best-effort — recording never breaks an ingestion pass.
- Updated dependencies [eddca5d]
- Updated dependencies [2126da2]
- Updated dependencies [6035103]
- Updated dependencies [3f93fd8]
  - @aioi/database@0.10.0

## 0.5.3

### Patch Changes

- Updated dependencies [da375de]
- Updated dependencies [bc95bde]
- Updated dependencies [537a036]
  - @aioi/database@0.9.0
  - @aioi/ui@0.1.0

## 0.5.2

### Patch Changes

- d021fac: Enforce sign-in when Clerk is configured: middleware protects every app route (unauthenticated →
  sign-in) and `getDevOrg` no longer falls back to the dev tenant in auth mode. Pass-through without keys.
- Updated dependencies [0d328db]
  - @aioi/database@0.8.0

## 0.5.1

### Patch Changes

- Updated dependencies [2995824]
  - @aioi/database@0.7.0

## 0.5.0

### Minor Changes

- 7e21e0d: Frontend Clerk sign-in: conditionally wire `@clerk/nextjs` on `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  (ClerkProvider + header sign-in/UserButton + clerkMiddleware, pass-through without keys). `getDevOrg`
  resolves the signed-in user's tenant when Clerk is enabled, else the dev tenant.

## 0.4.0

### Minor Changes

- 5488c28: Billing & entitlements (B-020): new `@aioi/billing` (plans + entitlements + `PlanLimitError`),
  `getPlan`/`setPlan`/`getEntitlements` on Subscription (org-scoped RLS), `createWatchlist` enforces the
  plan's watchlist limit, a `billing` tRPC router (plan/setPlan), and a `/billing` page. Stripe
  checkout/webhooks follow.

### Patch Changes

- Updated dependencies [5488c28]
- Updated dependencies [dd23ccb]
  - @aioi/database@0.6.0

## 0.3.0

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
- Updated dependencies [4e6f14d]
  - @aioi/database@0.5.0
  - @aioi/validation@0.2.0

## 0.2.0

### Minor Changes

- e7d23d8: Semantic trend search (B-019): an `Embedder` in `@aioi/ai-sdk` (Stub + LiteLLM, dim 1536), a pgvector
  `embedding` column + HNSW cosine index on Trend backfilled on persist, `semanticSearchTrends(q)` and a
  public `trends.semanticSearch` endpoint, and a Keyword/Semantic toggle on the trends search.
- c01468e: Trend keyword full-text search (B-019): a STORED generated `searchVector` + GIN index on Trend, a
  `searchTrends(q, limit)` repo (`plainto_tsquery`, ranked by `ts_rank` then recency), a public
  `trends.search` tRPC endpoint, and a search box on the trends page. Semantic (pgvector) search follows.

### Patch Changes

- Updated dependencies [5762d93]
- Updated dependencies [486c37f]
- Updated dependencies [e7d23d8]
- Updated dependencies [c01468e]
  - @aioi/database@0.4.0

## 0.1.0

### Minor Changes

- 982b2aa: Add the alerts & notifications UI: an Alerts section on the watchlist detail (create/enable/disable/
  delete) and a `/notifications` inbox (mark read / mark all read) with a nav link, via Server Actions
  over the RLS-enforced repositories (B-017).
- 4404aa1: Add the Watchlists UI: `/watchlists` (list + create + delete) and `/watchlists/[id]` (items +
  add/remove) as RSC pages with Server Actions over the RLS-enforced repository, plus a nav link. A
  request-cached dev-org resolver stands in for a session until Clerk is wired (B-016).

### Patch Changes

- Updated dependencies [5d583c8]
- Updated dependencies [0634493]
  - @aioi/database@0.3.0
  - @aioi/validation@0.1.0

## 0.0.3

### Patch Changes

- Updated dependencies [c2a8c88]
- Updated dependencies [8a43b68]
  - @aioi/database@0.2.0

## 0.0.2

### Patch Changes

- Updated dependencies [1bc6a1b]
  - @aioi/database@0.1.0

## 0.0.1

### Patch Changes

- Updated dependencies [61b169f]
  - @aioi/ui@0.0.1
