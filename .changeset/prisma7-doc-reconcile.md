---
---

Docs (Prisma 7 reconcile): update `DEPLOYMENT_GUIDE.md` and `CICD.md`, which still described the old
`binaryTargets = ["native","rhel-openssl-3.0.x"]` requirement. Under Prisma 7 (B-025) the client runs
through the `@prisma/adapter-pg` driver adapter — there is no query-engine binary and no `binaryTargets`
— and connection URLs live in `packages/database/prisma.config.ts` / the runtime adapter rather than in
`schema.prisma`. Docs-only.
