# @aioi/database

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
