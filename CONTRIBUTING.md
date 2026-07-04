# Contributing

Thanks for contributing to the AI Opportunity Intelligence Platform. This repo is built to a
high standard — please read the [Code Guidelines](docs/08-quality/CODE_GUIDELINES.md) and
[Branching Strategy](docs/09-process/BRANCHING_STRATEGY.md) first.

## Prerequisites

- Node.js 24 (`.nvmrc`), pnpm 9.12, Docker (for local Postgres/Redis).

## Setup

```bash
pnpm install
cp .env.example .env                 # fill in what you need
docker compose -f infra/docker/docker-compose.yml up -d postgres redis
pnpm --filter @aioi/database migrate:dev
pnpm dev
```

## Branching & PR flow

- Branch off **`development`**: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`.
- Hotfixes branch off **`main`**: `hotfix/<slug>` → PR into `main` (then back-merge to `development`).
- Open PRs into **`development`**. Release to production is a `development` → `main` PR.
- Keep PRs small and focused. Fill in the PR template.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/), enforced by commitlint:
`type(scope): summary` — e.g. `feat(api): add trends.bySlug`. Allowed scopes are in
`commitlint.config.cjs`.

## Before you push

Husky runs formatting on commit and the fast gate on push. Run the full gate yourself:

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

## Changesets

Any change to a `@aioi/*` package's behavior needs a changeset:

```bash
pnpm changeset      # pick packages + bump + summary; commit the generated file
```

## Definition of Done

See [CODE_GUIDELINES §9](docs/08-quality/CODE_GUIDELINES.md#9-definition-of-done-per-story). In
short: tests green, types strict, input validated, RBAC/audit where relevant, docs + CHANGELOG +
changeset updated, CI green.
