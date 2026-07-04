# Workflow — Onboarding

1. Read `.claude/PROJECT.md`, `STACK.md`, `ARCHITECTURE.md`.
2. `pnpm install`; copy `.env.example`; `docker compose -f infra/docker/docker-compose.yml up -d postgres redis`.
3. `pnpm --filter @aioi/database migrate:dev`; `pnpm dev`.
4. Run `pnpm test`; open the app; pick a `good-first-issue` from the backlog.

## Definition of done
Green CI (format·lint·typecheck·test·build·security) · tests updated · docs/CHANGELOG/changeset
updated · PR into `development` reviewed. See [CODE_GUIDELINES §9](../../docs/08-quality/CODE_GUIDELINES.md).
