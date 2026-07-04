---
"@aioi/database": minor
---

Add Row-Level Security: `FORCE` RLS + tenant_isolation policies on org-scoped tables, and a
`withOrgContext(orgId, fn)` helper that sets the org GUC per transaction (fail-closed). Requires the
app to connect as a non-superuser role to enforce (ADR-0003 / B-027).
