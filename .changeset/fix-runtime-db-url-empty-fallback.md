---
"@aioi/database": patch
---

Fix `ECONNREFUSED` in scheduled scripts (deliver-alerts, weekly-digest, etc.) when `APP_DATABASE_URL`
is not configured. The runtime Prisma client resolved its connection string with
`process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL`, but GitHub Actions injects an unset secret
as an **empty string**, not `undefined` — so `??` kept `""`, and the node-postgres adapter silently
defaulted to `localhost:5432` and failed to connect. (`prisma migrate deploy` was unaffected because
the CLI reads `DATABASE_URL` directly, which is why migrations succeeded while the runtime client threw.)
Switched to `||` so an empty value falls back to `DATABASE_URL`, matching the documented intent and the
`Boolean(process.env.APP_DATABASE_URL)` guard used throughout the test suite.
