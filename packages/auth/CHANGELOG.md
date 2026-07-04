# @aioi/auth

## 0.1.0

### Minor Changes

- 2f7c639: Add `@aioi/auth`: provider-neutral auth adapter (Clerk + Stub), RBAC (roles → permissions,
  deny-by-default `can`/`requirePermission`), and tenant guard; wire it into the API context and add a
  `protectedProcedure` (B-014 / ADR-0002).
