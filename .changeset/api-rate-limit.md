---
"@aioi/database": minor
"@aioi/web": minor
---

API rate limiting: authenticated API keys now count against a 1,000/day quota (DB-backed), return
X-RateLimit-* headers, and get a 429 when exhausted. Usage shown per key on /team. New ApiKeyUsage model

- recordApiKeyUsage/getApiKeyUsageToday.
