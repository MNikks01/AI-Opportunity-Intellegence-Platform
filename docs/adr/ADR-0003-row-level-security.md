# ADR-0003 — Row-Level Security implementation

- **Status:** Accepted
- **Date:** 2026-07-04
- **Deciders:** Database Engineer, Security Engineer, Architect
- **Context source:** [ADR-0002 D5](ADR-0002-auth-rbac-model.md), [`database`/`security` skills], B-014

## Context

ADR-0002 D5 committed to Postgres RLS as the tenant-isolation backstop behind the app-layer
`tenantGuard`. This ADR fixes the concrete implementation: which tables, how the org context is set,
and the operational requirement that makes RLS actually enforce.

## Decision

### D1 — FORCE RLS + a per-transaction org GUC

Tenant tables get `ENABLE` + **`FORCE ROW LEVEL SECURITY`** with a `tenant_isolation` policy:
`USING/WITH CHECK ("organizationId" = current_setting('app.current_org', true)::uuid)`. The org is set
per transaction via `set_config('app.current_org', <uuid>, true)` — exposed as `withOrgContext(orgId, fn)`
in `@aioi/database`. It's **fail-closed**: with no context, `current_setting(...,true)` is NULL and no
rows match (read) and no inserts pass (WITH CHECK). The org id always comes from the authenticated
context (@aioi/auth) — never from client input.

### D2 — The application MUST connect as a non-superuser, non-BYPASSRLS role

**Critical:** Postgres superusers and `BYPASSRLS` roles ignore RLS _even with FORCE_. So the app runtime
must connect as a restricted role (e.g. `aioi_app`, `NOSUPERUSER NOBYPASSRLS`, granted CRUD on the
tenant tables). **Migrations** run as the owner/privileged role (they must alter schema). Verified: the
default `aioi` superuser bypasses RLS; a `rls_app` restricted role enforces it (see `rls.test.ts`).

### D3 — Scope (first slice)

RLS applied to tables with a **direct `organizationId`**: `Workspace, Watchlist, ApiKey, AuditLog,
Brief, Subscription`. **Excluded:** `Organization`/`User` (root of the tenant graph),
`Membership` (part of the auth graph, gated by app-layer RBAC), and child-scoped tables
`Report`/`WatchlistItem`/`Alert` (keyed via a parent) — these get EXISTS-based policies when their CRUD
lands. Organizations are created in a privileged bootstrap path (no RLS on the root).

## Consequences

- **Positive:** defense-in-depth tenant isolation proven at the DB layer (4 integration tests via a
  restricted role); fail-closed by default; org context can't leak across pooled connections (SET LOCAL
  resets per transaction).
- **Negative / required next steps:** the runtime needs a **restricted DB role + a separate app
  connection string** (tracked as **B-027**); child-scoped tables need EXISTS policies when built; every
  tenant write must go through `withOrgContext` (enforced in review).

## Alternatives considered

- **App-layer scoping only (no RLS)** — rejected; one missed `where` clause leaks a tenant.
- **Schema-per-tenant / DB-per-tenant** — heavy ops cost; unnecessary at our scale.
- **A shared superuser connection** — rejected; RLS would never enforce (D2).

## Follow-ons

B-027 (wire the runtime to a restricted `aioi_app` role + `APP_DATABASE_URL`), EXISTS policies for
child tables, and adopting `withOrgContext` in every tenant repository as CRUD is built (B-016+).
