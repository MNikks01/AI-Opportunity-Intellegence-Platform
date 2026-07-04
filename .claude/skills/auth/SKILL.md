---
name: auth
description: >-
  Deep guidance for authentication, RBAC, and multi-tenancy in the AI Opportunity Intelligence
  Platform. Auth is Clerk behind the @aioi/auth adapter (swappable). Use when building sign-in/orgs,
  permission checks, the tenant guard, RLS wiring, API-key auth, session/token handling, or reviewing
  any access-control code. This is the backbone of B-014.
---

# Auth, RBAC & Multi-Tenancy

Authentication is **Clerk today, behind the `@aioi/auth` adapter** so it can be swapped (ADR-0001).
Nothing outside `@aioi/auth` imports Clerk. The platform is multi-tenant: an **Organization** is the
billing + membership + isolation boundary; a **Workspace** (personal or team) lives under an org.
Every request resolves to `{ userId, orgId, role }` and every access is gated by RBAC + tenant scope +
Postgres RLS. See [TRD](../../../docs/01-product/TECHNICAL_REQUIREMENTS_DOCUMENT.md), [DB design](../../../docs/04-data/DATABASE_DESIGN.md).

## When to apply

- Building sign-up/sign-in, org creation, invites, or the workspace switcher.
- Adding permission checks, the tenant guard, RLS context, or API-key auth.
- Reviewing any route/procedure for access control, or swapping the auth provider.

## Rule categories by priority

| Priority | Category | Why |
|---|---|---|
| **CRITICAL** | Server-derived identity | Trusting client-sent user/org id is the classic breach. |
| **CRITICAL** | RBAC deny-by-default | Missing a check = privilege escalation. |
| **CRITICAL** | Tenant isolation | Org boundary must hold at app + DB (RLS) layers. |
| **HIGH** | Adapter isolation | Clerk stays behind `@aioi/auth` (swappable per ADR-0001). |
| **HIGH** | API-key auth | Third-party access must be scoped, hashed, metered. |
| **MEDIUM** | Session/token hygiene | Short access + rotating refresh; revoke on logout. |
| **MEDIUM** | Provisioning & lifecycle | Org/workspace bootstrap, invites, role changes, offboarding. |

## Roles & permissions

Roles: **Owner · Admin · Member · Billing · Viewer** (Prisma `Role` enum). Permissions are
action strings like `watchlists:read`, `reports:write`, `org:admin`, `apikeys:manage`. Centralize the
role→permission map in `@aioi/auth`; check with `can(ctx, action)` / `requirePermission(ctx, action)`.

| Action (examples) | Owner | Admin | Member | Billing | Viewer |
|---|---|---|---|---|---|
| read trends/opportunities | ✅ | ✅ | ✅ | ✅ | ✅ |
| create/edit watchlists, reports | ✅ | ✅ | ✅ | ❌ | ❌ |
| manage members/roles | ✅ | ✅ | ❌ | ❌ | ❌ |
| billing & subscription | ✅ | ❌ | ❌ | ✅ | ❌ |
| manage API keys, org settings | ✅ | ✅ | ❌ | ❌ | ❌ |
| delete org | ✅ | ❌ | ❌ | ❌ | ❌ |

## Quick reference — the rules

### 1. Server-derived identity (CRITICAL)
- Resolve `{ userId, orgId, role }` from the Clerk session (web) or API key (public) inside
  `createContext`. **Never** read org/user id from the request body/query.
- The active workspace/org lives in the session, not the URL (except global shareable trend/entity pages).

### 2. RBAC deny-by-default (CRITICAL)
- `requirePermission(ctx, action)` at the top of every mutating/privileged handler; default deny.
- Check on tRPC procedures, REST routes, **and** WebSocket channel subscriptions.

### 3. Tenant isolation (CRITICAL)
- Scope every tenant query by `ctx.orgId`. Set `SET LOCAL app.current_org = ctx.orgId` per transaction
  so RLS backs the app-layer guard. Verify resource ownership before update/delete (no IDOR).

### 4. Adapter isolation (HIGH)
- Only `@aioi/auth` imports Clerk. Expose framework-neutral `getAuth(req)`, `requirePermission`,
  `can`, `tenantGuard`. Swapping to Auth.js later is an adapter change, not a rewrite.

### 5. API keys (HIGH)
- Store a **hash** only; show the raw key once. Scope keys (`scopes[]`); rate-limit + meter per key;
  support rotate/revoke. Keys map to an org, not a user.

### 6. Session/token hygiene (MEDIUM)
- Short-lived access + rotating refresh; revoke on logout; `Secure`/`HttpOnly`/`SameSite` cookies;
  CSRF protection on cookie flows; strict CORS.

### 7. Lifecycle (MEDIUM)
- On sign-up: create Organization + personal Workspace (bootstrap). Invites assign a role; role
  changes + removals are audited. Offboarding revokes sessions/keys.

## Patterns — good vs bad

**Context + permission + tenant scope:**
```ts
// ❌ BAD — identity + org from the client; no permission check
const orgId = input.orgId;                       // attacker-controlled
return prisma.report.findMany({ where: { workspace: { organizationId: orgId } } });

// ✅ GOOD — identity from session, RBAC, tenant-scoped
export function createContext(req): Ctx {
  const { userId, orgId, role } = getAuth(req);  // @aioi/auth (Clerk under the hood)
  return { userId, orgId, role };
}
export async function listReports(ctx: Ctx) {
  await requirePermission(ctx, "reports:read");
  return reportRepo.listByOrg(ctx.orgId);        // scoped; RLS backstops
}
```

**RLS context per transaction:**
```ts
// ✅ GOOD — DB enforces org isolation even if a query forgets to scope
await prisma.$transaction(async (tx) => {
  await tx.$executeRaw`SET LOCAL app.current_org = ${ctx.orgId}::uuid`;
  return reportRepo.create(tx, ctx.orgId, input);
});
```

**API key (hashed, scoped, metered):**
```ts
// ✅ GOOD — hash at rest, verify by hash, enforce scope + meter
const hashed = sha256(rawKey);
const key = await prisma.apiKey.findUnique({ where: { hashedKey: hashed } });
if (!key || key.revokedAt || !key.scopes.includes("trends:read")) throw unauthorized();
await meter(key.id); // usage → Stripe metered billing
```

## Step-by-step: implement B-014 (auth + RBAC + tenancy)

1. **`@aioi/auth` adapter** — `getAuth(req)` (Clerk session → `{userId,orgId,role}`), `can`,
   `requirePermission`, `tenantGuard`, and the role→permission map. Keep Clerk imports here only.
2. **Context** — wire `createContext` in `services/api` (web session + API key paths).
3. **RLS** — add the RLS policies + `SET LOCAL app.current_org` in the transaction helper.
4. **Bootstrap** — on first sign-in, create Organization + personal Workspace; seed default watchlist.
5. **Guards** — `protectedProcedure` + `requirePermission` across routers; gate WS channels.
6. **API keys** — CRUD (hashed/scoped), rate-limit + meter.
7. **Tests** — permission matrix (each role × action), cross-tenant denial, IDOR, expired/revoked key.
8. Docs (AUTH_DESIGN/RBAC) + CHANGELOG + changeset.

## Decision guide

| Situation | Do | Don't |
|---|---|---|
| Get current org/user | from session/API-key context | from request body/query |
| Cross-service identity | pass verified context / signed token | re-derive from client |
| New protected route | `protectedProcedure` + `requirePermission` | rely on UI hiding it |
| Third-party access | scoped, hashed, metered API key | share a user session/JWT |
| Provider change later | swap inside `@aioi/auth` | leak Clerk types across packages |

## Failure modes → fixes

| Symptom | Cause | Fix |
|---|---|---|
| User accesses another org's data | org id from client / no RLS | server-derived org + RLS + ownership check |
| Viewer performs writes | missing/incorrect RBAC | `requirePermission`; correct role map; test matrix |
| Clerk types leak everywhere | adapter not isolated | confine to `@aioi/auth`; expose neutral API |
| Leaked API key still works | no revoke / not hashed | hash at rest; revoke flag; rotate |
| Session fixation / stale access | no rotation/revocation | rotating refresh; revoke on logout/role change |

## Pre-delivery checklist

- [ ] Identity resolved server-side (session/API key); never from client input
- [ ] `requirePermission` (deny-by-default) on every mutating/privileged path (tRPC + REST + WS)
- [ ] Tenant queries scoped by `ctx.orgId`; RLS `app.current_org` set; ownership verified (no IDOR)
- [ ] Clerk confined to `@aioi/auth`; neutral adapter API
- [ ] API keys hashed, scoped, rate-limited, metered, revocable
- [ ] Short access + rotating refresh; CSRF/CORS/secure cookies
- [ ] Org + workspace bootstrap on sign-up; invites/role-changes audited
- [ ] Permission-matrix + cross-tenant + IDOR + revoked-key tests green
- [ ] AUTH_DESIGN/RBAC docs + CHANGELOG + changeset updated

## References
[TRD](../../../docs/01-product/TECHNICAL_REQUIREMENTS_DOCUMENT.md) · [ADR-0001](../../../docs/adr/ADR-0001-core-stack.md) ·
[DATABASE_DESIGN](../../../docs/04-data/DATABASE_DESIGN.md) · skills: `backend`, `database`, `security`, `payments`.
