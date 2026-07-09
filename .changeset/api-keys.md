---
"@aioi/database": minor
"@aioi/web": minor
---

API keys: manage read-API keys on /team (create with one-time reveal, list, revoke) and optional
Bearer auth on /api/v1 that raises the limit cap (anon ≤25, authed ≤100) and records usage. New
touchApiKey; reuses the existing ApiKey infra.
