---
"@aioi/database": minor
"@aioi/api": minor
---

GDPR export/delete (B-023): `exportOrgData` (org-scoped portability, no secrets) + `deleteOrg`
(right-to-erasure hard delete, cascades) and a `gdpr` tRPC router (export admin-gated; deleteOrg
owner-only). Also hardens all RLS policies with `NULLIF(current_setting('app.current_org',true),'')`
so an unset/empty org fails closed instead of throwing `''::uuid` on pooled connections.
