# @aioi/web

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
