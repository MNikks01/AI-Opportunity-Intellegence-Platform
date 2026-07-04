# Workflow — Migration

1. Change `packages/database/prisma/schema.prisma`.
2. `pnpm --filter @aioi/database migrate:dev --name <slug>`.
3. Audit for lock safety + tenant isolation (migration-auditor); batch backfills.
4. Ensure expand/contract (backward-compatible) so rollback is safe.
5. PR into `development`.

## Definition of done
Green CI (format·lint·typecheck·test·build·security) · tests updated · docs/CHANGELOG/changeset
updated · PR into `development` reviewed. See [CODE_GUIDELINES §9](../../docs/08-quality/CODE_GUIDELINES.md).
