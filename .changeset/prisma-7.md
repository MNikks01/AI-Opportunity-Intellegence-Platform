---
"@aioi/database": minor
---

Prisma 5→7 migration (B-025). Prisma 7 replaces the bundled query-engine binary with a **driver adapter**
(`@prisma/adapter-pg` over node-postgres) and moves connection URLs out of `schema.prisma`:

- New `packages/database/prisma.config.ts` holds the CLI/`migrate` datasource URL (owner `DATABASE_URL`);
  it loads the monorepo-root `.env` and falls back to a localhost URL so `prisma generate` (which never
  connects) still succeeds during `pnpm install`.
- `src/client.ts` now instantiates `PrismaClient({ adapter: new PrismaPg({ connectionString }) })` using
  `APP_DATABASE_URL ?? DATABASE_URL`, so the runtime keeps connecting as the restricted `aioi_app` role
  and RLS still enforces (ADR-0003 / B-027). The integration test's fresh connection uses its own adapter.
- Dropped `binaryTargets` (no engine binary under adapters — removes the `rhel-openssl-3.0.x` serverless
  footgun). Kept the `prisma-client-js` generator, so `@prisma/client` imports and every repository are
  unchanged.

Validated end-to-end: `prisma migrate deploy` via the new config + **62 DB-integration tests (including
the RLS fail-closed suite) green against live Postgres 16 + pgvector**. Dependabot continues to hold the
next Prisma major for a deliberate migration.
