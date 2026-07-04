---
"@aioi/auth": minor
---

Add API-key authentication: `ApiKeyAuthProvider` (bearer `aioi_…`, SHA-256 hash-only storage),
`generateApiKey`/`hashApiKey`/`extractApiKey`, scope-gated authorization (a key never exceeds its
scopes), and `ChainAuthProvider` to try API keys then the session via `getAuthProvider` (ADR-0002 D6).
