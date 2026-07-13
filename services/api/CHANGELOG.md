# @aioi/api

## 0.9.2

### Patch Changes

- Updated dependencies [ad749a4]
- Updated dependencies [b6bf357]
- Updated dependencies [62a79b6]
  - @aioi/database@0.26.0
  - @aioi/validation@0.4.0
  - @aioi/ai-service@0.7.8

## 0.9.1

### Patch Changes

- Updated dependencies [e07f082]
- Updated dependencies [157b114]
  - @aioi/database@0.25.0
  - @aioi/ai-service@0.7.7

## 0.9.0

### Minor Changes

- 7ac46a0: Gate the tRPC `trends.semanticSearch` procedure on the plan entitlement. It is now a
  `protectedProcedure` that requires `search:read` and a plan granting `semanticSearch` (Pro/Team),
  returning FORBIDDEN otherwise — closing the last ungated semantic-search surface (the web /trends
  flow was already gated).

### Patch Changes

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
  - @aioi/ai-service@0.7.6

## 0.8.20

### Patch Changes

- Updated dependencies [ea8c984]
  - @aioi/database@0.23.1
  - @aioi/ai-service@0.7.5

## 0.8.19

### Patch Changes

- Updated dependencies [d122844]
- Updated dependencies [30ddabc]
  - @aioi/database@0.23.0
  - @aioi/billing@0.3.0
  - @aioi/ai-service@0.7.4

## 0.8.18

### Patch Changes

- Updated dependencies [a890f98]
- Updated dependencies [1009efc]
- Updated dependencies [a8f0a49]
  - @aioi/database@0.22.0
  - @aioi/ai-service@0.7.3

## 0.8.17

### Patch Changes

- Updated dependencies [149dd8d]
  - @aioi/database@0.21.0
  - @aioi/ai-service@0.7.2

## 0.8.16

### Patch Changes

- Updated dependencies [89fa03c]
- Updated dependencies [f6907ac]
  - @aioi/database@0.20.0
  - @aioi/ai-service@0.7.1

## 0.8.15

### Patch Changes

- Updated dependencies [2d70e24]
- Updated dependencies [746979c]
  - @aioi/database@0.19.0
  - @aioi/ai-service@0.7.0
  - @aioi/shared@0.2.0

## 0.8.14

### Patch Changes

- Updated dependencies [dd48ae9]
  - @aioi/database@0.18.0
  - @aioi/ai-service@0.6.3

## 0.8.13

### Patch Changes

- Updated dependencies [e91c90b]
- Updated dependencies [dc47b88]
  - @aioi/database@0.17.0
  - @aioi/ai-service@0.6.2

## 0.8.12

### Patch Changes

- Updated dependencies [13a4d82]
  - @aioi/database@0.16.0
  - @aioi/ai-service@0.6.1

## 0.8.11

### Patch Changes

- Updated dependencies [bdc16f0]
  - @aioi/validation@0.3.0
  - @aioi/ai-service@0.6.0
  - @aioi/database@0.15.1

## 0.8.10

### Patch Changes

- Updated dependencies [20f71a4]
  - @aioi/database@0.15.0
  - @aioi/ai-service@0.5.0

## 0.8.9

### Patch Changes

- Updated dependencies [0fc7986]
- Updated dependencies [25880d3]
  - @aioi/database@0.14.1
  - @aioi/ai-service@0.4.7

## 0.8.8

### Patch Changes

- Updated dependencies [e7f0515]
- Updated dependencies [0a324c5]
- Updated dependencies [12c676f]
  - @aioi/database@0.14.0
  - @aioi/ai-service@0.4.6

## 0.8.7

### Patch Changes

- Updated dependencies [fbccec0]
- Updated dependencies [05b9e7f]
  - @aioi/database@0.13.0
  - @aioi/ai-service@0.4.5

## 0.8.6

### Patch Changes

- Updated dependencies [ed24c47]
  - @aioi/database@0.12.0
  - @aioi/ai-service@0.4.4

## 0.8.5

### Patch Changes

- Updated dependencies [aa401cc]
  - @aioi/shared@0.1.0
  - @aioi/database@0.11.3
  - @aioi/ai-service@0.4.3

## 0.8.4

### Patch Changes

- @aioi/database@0.11.2
- @aioi/ai-service@0.4.2

## 0.8.3

### Patch Changes

- Updated dependencies [919cf06]
  - @aioi/database@0.11.1
  - @aioi/ai-service@0.4.1

## 0.8.2

### Patch Changes

- Updated dependencies [773471d]
  - @aioi/ai-service@0.4.0
  - @aioi/database@0.11.0

## 0.8.1

### Patch Changes

- Updated dependencies [2271dca]
  - @aioi/ai-service@0.3.0
  - @aioi/database@0.10.1

## 0.8.0

### Minor Changes

- 3f93fd8: Connector health surface: `getSourceStats` (per-source signal counts + last-ingested time), an
  admin-gated `sources.stats` tRPC endpoint, and a `/sources` page rendering it with the `@aioi/ui`
  DataTable (source, signals, last ingested, legality tier).

### Patch Changes

- Updated dependencies [eddca5d]
- Updated dependencies [2126da2]
- Updated dependencies [6035103]
- Updated dependencies [3f93fd8]
  - @aioi/database@0.10.0
  - @aioi/ai-service@0.2.1

## 0.7.0

### Minor Changes

- da375de: GDPR export/delete (B-023): `exportOrgData` (org-scoped portability, no secrets) + `deleteOrg`
  (right-to-erasure hard delete, cascades) and a `gdpr` tRPC router (export admin-gated; deleteOrg
  owner-only). Also hardens all RLS policies with `NULLIF(current_setting('app.current_org',true),'')`
  so an unset/empty org fails closed instead of throwing `''::uuid` on pooled connections.

### Patch Changes

- Updated dependencies [c4ac5c2]
- Updated dependencies [da375de]
- Updated dependencies [bc95bde]
  - @aioi/ai-service@0.2.0
  - @aioi/database@0.9.0

## 0.6.1

### Patch Changes

- Updated dependencies [0d328db]
  - @aioi/database@0.8.0
  - @aioi/ai-service@0.1.3

## 0.6.0

### Minor Changes

- 2995824: API-key management + auth lookup (B-014 cont.): `createApiKey`/`listApiKeys`/`revokeApiKey` (org-scoped,
  RLS) + a SECURITY DEFINER `app_find_api_key` for the RLS-safe auth-time lookup, wired into the API
  context so `Authorization: Bearer aioi_…` authenticates against the DB. Adds an admin-gated `apikeys` router.
- eab0a4f: Stripe payments (B-020 cont.): a `BillingProvider` seam (Stub + Stripe checkout sessions),
  `billing.checkout` returning a session URL, and a signature-verified `POST /webhooks/stripe` that syncs
  `customer.subscription.*` events to `setPlan`. Inert without Stripe keys (Stub fallback).

### Patch Changes

- Updated dependencies [2995824]
- Updated dependencies [eab0a4f]
  - @aioi/database@0.7.0
  - @aioi/billing@0.2.0
  - @aioi/ai-service@0.1.2

## 0.5.0

### Minor Changes

- 8fcdb7c: Clerk verifier + sign-up webhook (B-014/B-015): the API verifies real Clerk session JWTs via the auth
  adapter when CLERK_SECRET_KEY is set (else the Stub), and a Svix-verified POST /webhooks/clerk
  provisions a tenant on user.created (bootstrapUser). buildServer is now async (raw body for signatures).

## 0.4.0

### Minor Changes

- 5488c28: Billing & entitlements (B-020): new `@aioi/billing` (plans + entitlements + `PlanLimitError`),
  `getPlan`/`setPlan`/`getEntitlements` on Subscription (org-scoped RLS), `createWatchlist` enforces the
  plan's watchlist limit, a `billing` tRPC router (plan/setPlan), and a `/billing` page. Stripe
  checkout/webhooks follow.

### Patch Changes

- Updated dependencies [5488c28]
- Updated dependencies [dd23ccb]
  - @aioi/billing@0.1.0
  - @aioi/database@0.6.0
  - @aioi/ai-service@0.1.1

## 0.3.0

### Minor Changes

- c10faf2: Action-plan generators (B-021): `generateActionPlan` in `@aioi/ai-sdk` (Stub + LiteLLM, schema-validated)

  - `@aioi/ai-service` orchestration, `persistActionPlan`/`getActionPlan` with `getTrendBySlug` including
    the plan, an admin-gated `trends.generateActionPlan` mutation, and a plan section on the trend detail
    page. Also adds `main`/`types` to `@aioi/ai-service` so it can be imported.

- 4e6f14d: Daily Brief (B-018): `generateDailyBrief` aggregates top-opportunity trends + the org's
  watchlist/unread-alert counts into a `Brief` (in-app delivered), with `listBriefs`/`getBrief` and open
  tracking (`markBriefOpened`). Adds a `briefs` tRPC router and a `/briefs` list + detail UI. Org-scoped (RLS).
- d951129: Redis read-model cache (B-011): new `@aioi/cache` (cache-aside over ioredis with graceful degradation +
  lazy fail-fast client). The trends read endpoints are cached (`trends.list` 60s, keyword/semantic
  search 30s); bypassed in tests / when `CACHE_DISABLED=1`.

### Patch Changes

- Updated dependencies [c10faf2]
- Updated dependencies [4e6f14d]
- Updated dependencies [d951129]
  - @aioi/ai-service@0.1.0
  - @aioi/database@0.5.0
  - @aioi/validation@0.2.0
  - @aioi/cache@0.1.0

## 0.2.0

### Minor Changes

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

- Updated dependencies [5762d93]
- Updated dependencies [486c37f]
- Updated dependencies [e7d23d8]
- Updated dependencies [c01468e]
  - @aioi/database@0.4.0

## 0.1.0

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
  - @aioi/database@0.3.0
  - @aioi/validation@0.1.0

## 0.0.3

### Patch Changes

- Updated dependencies [333ffe7]
- Updated dependencies [c2a8c88]
- Updated dependencies [8a43b68]
  - @aioi/auth@0.2.0
  - @aioi/database@0.2.0

## 0.0.2

### Patch Changes

- Updated dependencies [1bc6a1b]
  - @aioi/database@0.1.0

## 0.0.1

### Patch Changes

- 2f7c639: Add `@aioi/auth`: provider-neutral auth adapter (Clerk + Stub), RBAC (roles → permissions,
  deny-by-default `can`/`requirePermission`), and tenant guard; wire it into the API context and add a
  `protectedProcedure` (B-014 / ADR-0002).
- Updated dependencies [2f7c639]
  - @aioi/auth@0.1.0
