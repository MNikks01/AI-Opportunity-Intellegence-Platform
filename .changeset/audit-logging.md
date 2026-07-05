---
"@aioi/database": minor
"@aioi/api": minor
---

Audit logging (B-022): a tRPC middleware on `protectedProcedure` writes an `AuditLog` entry for every
successful mutation (best-effort), covering all protected mutations cross-cuttingly. Adds
`writeAuditLog`/`listAuditLogs` (org-scoped, RLS) and an admin-gated `audit.list` endpoint.
