---
"@aioi/database": patch
---

Add the `rhel-openssl-3.0.x` Prisma `binaryTargets` engine alongside `native`, so the query engine
binary exists on serverless Linux runtimes (Vercel/Lambda) — without it, a deploy crashes at runtime
with "query engine binary not found". Local dev still uses `native`.
