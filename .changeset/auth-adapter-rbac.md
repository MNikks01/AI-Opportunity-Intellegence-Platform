---
"@aioi/auth": minor
"@aioi/api": patch
---

Add `@aioi/auth`: provider-neutral auth adapter (Clerk + Stub), RBAC (roles → permissions,
deny-by-default `can`/`requirePermission`), and tenant guard; wire it into the API context and add a
`protectedProcedure` (B-014 / ADR-0002).
