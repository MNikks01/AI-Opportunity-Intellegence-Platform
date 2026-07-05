---
"@aioi/database": minor
"@aioi/api": minor
---

API-key management + auth lookup (B-014 cont.): `createApiKey`/`listApiKeys`/`revokeApiKey` (org-scoped,
RLS) + a SECURITY DEFINER `app_find_api_key` for the RLS-safe auth-time lookup, wired into the API
context so `Authorization: Bearer aioi_…` authenticates against the DB. Adds an admin-gated `apikeys` router.
