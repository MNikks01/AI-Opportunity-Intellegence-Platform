# ADR-0002 — Authentication & RBAC model

- **Status:** Accepted
- **Date:** 2026-07-04
- **Deciders:** Architect, Security Engineer, Backend Engineer
- **Context source:** [B-014](../09-process/BACKLOG.md), [`auth` skill](../../.claude/skills/auth/SKILL.md), extends [ADR-0001 D3](ADR-0001-core-stack.md)

## Context

ADR-0001 chose Clerk for v1 behind a `@aioi/auth` adapter. We now need the concrete shape of that
adapter and the RBAC/tenancy model that every route depends on. Requirements: identity resolved
server-side (never from client input), deny-by-default permissions, a swappable provider, and code
that is testable without Clerk keys or a database.

## Decision

### D1 — Provider-neutral `AuthProvider` interface

`@aioi/auth` exposes `AuthProvider.authenticate(req) → AuthContext | null`. Clerk is confined to
`ClerkAuthProvider`; a deterministic `StubAuthProvider` serves dev/test/local (mirrors the
`ai-sdk` StubProvider pattern). `getAuthProvider()` selects Clerk when a verifier + `CLERK_SECRET_KEY`
are present, else Stub. Consumers depend only on the interface → swapping to Auth.js is an adapter change.

### D2 — `AuthContext = { userId, orgId, role, email? }`, resolved server-side

The org (tenant boundary) and role come from the verified session/API key only. `ClerkAuthProvider`
requires an **active org** (returns null otherwise) so every authenticated request is org-scoped.

### D3 — Role→permission map, deny-by-default

Five roles (OWNER/ADMIN/MEMBER/BILLING/VIEWER, mirroring the Prisma enum) map to a fixed catalog of
`resource:action` permissions (`ROLE_PERMISSIONS`). Checks: `can(ctx, perm)` (boolean) and
`requirePermission(ctx, perm)` (throws typed `UnauthenticatedError`/`ForbiddenError`). Anything not
granted is denied. The map is the single source of truth (matches the `auth` skill table).

### D4 — Clerk verification is injected

To avoid a hard `@clerk/backend` dependency (and keys) in tests/other packages, `ClerkAuthProvider`
takes a `ClerkVerifier` function. Production wires it to `@clerk/backend`; tests inject a fake.

### D5 — Tenant isolation is defense-in-depth

App-layer `tenantGuard` asserts an org context; Postgres **RLS** (`SET LOCAL app.current_org`) is the
backstop (helper lives in `@aioi/database`, wired in the follow-up slice). Client-supplied org ids are
never trusted (`assertOrg` rejects mismatches).

### D6 — API-key authentication (machine clients)

Public API clients send `Authorization: Bearer aioi_<secret>`. We store only a **SHA-256 hash** of the
key (never the raw secret; shown once at creation). A key belongs to an org (its tenant boundary) and
carries **scopes** — a scope-down of the `Permission` catalog. `can()`/`requirePermission()` gate
API-key contexts by scopes, so a key **can never exceed its scopes** regardless of nominal role.
`ApiKeyAuthProvider` takes an injected hash lookup (decoupled from the DB); a `ChainAuthProvider` tries
API-key auth first, then the session provider, via one entry point (`getAuthProvider`). Because the key
resolves the org **before** any org context exists, the hash lookup must run on a **privileged path**
(owner role or a SECURITY DEFINER function) — RLS on `ApiKey` otherwise hides it (ADR-0003); this
lookup wiring lands with the API-key management endpoints.

## Consequences

- **Positive:** provider-swappable; fully unit-testable without Clerk/DB (47 tests); one RBAC source of
  truth; server-derived identity closes the classic IDOR/tenant-leak vectors.
- **Negative / deferred:** real Clerk verification, RLS transaction wiring, org+workspace bootstrap on
  sign-up, and API-key auth are follow-on slices of B-014 (this PR delivers the adapter + RBAC + guard).

## Alternatives considered

- **Build on Auth.js now** — more work; deferred behind the same adapter (ADR-0001 D3).
- **Roll our own sessions** — rejected (security risk, reinvention).
- **CASL/other policy engine** — overkill for a fixed role set; a simple map is clearer + faster.

## Follow-ons

ADR-0003 (if we swap the provider), and the B-014 continuation: Clerk verifier, RLS helper,
`protectedProcedure` adoption across routers, API-key auth, and sign-up bootstrap.
