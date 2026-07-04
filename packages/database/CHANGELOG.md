# @aioi/database

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
