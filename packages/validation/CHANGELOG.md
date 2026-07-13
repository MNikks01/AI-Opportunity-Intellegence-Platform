# @aioi/validation

## 0.4.0

### Minor Changes

- b6bf357: Watch + alert on a tracked entity (M15-A phase 2, B-032). You can now **watch** a supply-side entity
  (model / MCP server / repo) from its detail page and be alerted when it's **accelerating**.

  - New `ENTITY_MOMENTUM` alert trigger (`@aioi/validation`); the watchlist alert form offers "Entity
    accelerating".
  - `evaluateEntityAlertsAllOrgs` (run in the pipeline after entity snapshots) notifies each org whose
    watched entities are accelerating — reusing the existing watchlist + alert + Notification primitives,
    RLS-scoped, and **de-duped** (one unread notification per entity per alert).
  - A watch toggle on `/entities/{id}` (tracked types only), via the existing primary-watchlist flow.

  Pure `entityMomentumMatches` + a live-DB integration test (notify + de-dupe).

## 0.3.0

### Minor Changes

- bdc16f0: Three additions: (1) CSV/JSON export of the trends view; (2) a polish pass — loading skeletons, keyboard
  focus visibility, a11y touches; (3) optional LLM-powered entity extraction for open-ended discovery
  beyond the curated dictionary (`LLMProvider.extractEntities`, `extractEntitiesForTrends({ useLlm })`).

## 0.2.0

### Minor Changes

- c10faf2: Action-plan generators (B-021): `generateActionPlan` in `@aioi/ai-sdk` (Stub + LiteLLM, schema-validated)

  - `@aioi/ai-service` orchestration, `persistActionPlan`/`getActionPlan` with `getTrendBySlug` including
    the plan, an admin-gated `trends.generateActionPlan` mutation, and a plan section on the trend detail
    page. Also adds `main`/`types` to `@aioi/ai-service` so it can be imported.

## 0.1.0

### Minor Changes

- 5d583c8: Alerts engine (B-017): a `Notification` model, org-scoped alert + notification repositories, a pure
  trigger matcher (`NEW_TREND`/`SCORE_CROSSES`), and `evaluateTrendForOrg` that writes in-app
  notifications for matched alerts. Adds `alerts`/`notifications` tRPC routers (protected + RBAC) and RLS
  on `Alert` (EXISTS-via-parent) and `Notification` (direct-org).
- 0634493: Watchlists CRUD (B-016): org-scoped watchlist/item repository (`withOrgContext`), a `watchlists` tRPC
  router (protected + RBAC `watchlists:read`/`:write`), shared Zod schemas, and RLS on `WatchlistItem`
  (EXISTS-via-parent policy). Cross-tenant isolation for watchlists and items proven by integration tests.
