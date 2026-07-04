# @aioi/auth

## 0.2.0

### Minor Changes

- 333ffe7: Add API-key authentication: `ApiKeyAuthProvider` (bearer `aioi_…`, SHA-256 hash-only storage),
  `generateApiKey`/`hashApiKey`/`extractApiKey`, scope-gated authorization (a key never exceeds its
  scopes), and `ChainAuthProvider` to try API keys then the session via `getAuthProvider` (ADR-0002 D6).

## 0.1.0

### Minor Changes

- 2f7c639: Add `@aioi/auth`: provider-neutral auth adapter (Clerk + Stub), RBAC (roles → permissions,
  deny-by-default `can`/`requirePermission`), and tenant guard; wire it into the API context and add a
  `protectedProcedure` (B-014 / ADR-0002).
