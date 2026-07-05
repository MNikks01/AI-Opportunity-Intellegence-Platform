---
"@aioi/web": patch
---

Enforce sign-in when Clerk is configured: middleware protects every app route (unauthenticated →
sign-in) and `getDevOrg` no longer falls back to the dev tenant in auth mode. Pass-through without keys.
