# CI/CD

**Phase 19 · Status: complete · Last updated: 2026-07-10**
**Traces to:** [Infrastructure](INFRASTRUCTURE.md) · [Branching](../09-process/BRANCHING_STRATEGY.md) · [Release Process](../09-process/RELEASE_PROCESS.md) · [Deployment](DEPLOYMENT_GUIDE.md)
**Realized in:** `.github/workflows/*.yml`, `.changeset/`, Husky hooks, `commitlint.config.cjs`, `.github/dependabot.yml`.

The pipeline enforces one rule: **nothing reaches `main` that isn't formatted, linted, type-safe,
tested, and buildable — with no leaked secrets.** This document is the map of every automated workflow,
what gates it applies, and the hard-won configuration lessons behind them.

## 1. Branching → pipeline (GitFlow-lite)

```
feat/fix/chore/* → PR into development → CI → merge
development → PR into main (opened by maintainer) → CI → merge
main → Vercel auto-deploy (prod) + Release workflow (Changesets)
```

`main` is stable, `development` is integration, `hotfixes` for urgent fixes. Full rules in
[BRANCHING_STRATEGY](../09-process/BRANCHING_STRATEGY.md).

## 2. Local gates (Husky)

Run before code ever leaves a machine:

| Hook         | Enforces                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------ |
| `pre-commit` | `lint-staged` — format + lint the staged files.                                                              |
| `commit-msg` | `commitlint` — Conventional Commits, valid scopes (`commitlint.config.cjs`). **Subjects must be lowercase.** |
| `pre-push`   | `pnpm typecheck && pnpm test` — red never reaches the remote.                                                |

## 3. CI workflow (`ci.yml`)

Runs on push to `main`/`development`/`hotfixes` and on PRs into `main`/`development`.
`concurrency` cancels superseded runs on the same ref.

**Job `quality` — "Lint · Typecheck · Test · Build":**

1. Spins up service containers: `pgvector/pgvector:pg16` + `redis:7-alpine`.
2. `pnpm install --frozen-lockfile` (Node 24, pnpm 9.12, pnpm cache).
3. `prisma migrate deploy` against the CI Postgres.
4. Grants the restricted `aioi_app` role login so **RLS is exercised by the suite** (ADR-0003 / B-027).
5. `pnpm format:check` → `lint` → `typecheck` → `test` → `build`. Any failure fails the merge.

**Job `security` — "Security · Deps · Secrets":**

- `pnpm audit --audit-level high` (informational).
- **gitleaks** secret scan — **push events only** (the action needs PR-write perms that `pull_request`
  events, including Dependabot's read-only token, don't grant). Every push to a protected branch is
  scanned, so secrets are still caught before they persist.

> Planned: an `llm-eval-harness` smoke gate (B-009) will be added as a job here to block AI-quality
> regressions on prompt/model changes.

## 4. Release workflow (`release.yml`) — Changesets

On push to `main`, the Changesets action opens/updates a **"Version Packages"** PR from pending
changesets. Packages are private (no npm publish); merging the PR applies version bumps + per-package
changelogs. Needs `contents: write` + `pull-requests: write`. See
[RELEASE_PROCESS](../09-process/RELEASE_PROCESS.md).

**Every PR that changes behaviour must include a changeset** (`pnpm changeset`) — this is a repo directive.

## 5. Continuous delivery

- **Vercel** watches `main` → production deploy, and every PR → preview deploy. This is push-based CD;
  there is no manual deploy step for the web app.
- **Scheduled jobs** (`refresh-data`, `rescore`, `deliver-alerts`, `newsletter`, `weekly-digest`) run as
  their own cron workflows and are the production background pipeline — see
  [DEPLOYMENT_GUIDE](DEPLOYMENT_GUIDE.md) §5. Each is idempotent and no-ops without its secrets.

## 6. Dependency automation (Dependabot)

- Targets `development`; groups limited to **minor + patch**.
- `prisma` / `@prisma/client` **majors are ignored** until the B-025 migration is done (a major
  `prisma generate` postinstall crash was the lesson). TypeScript 6 (B-026) is likewise held.
- GitHub Actions are pinned and kept current (checkout v7, setup-node v6, pnpm/action-setup v6,
  gitleaks-action v3).

## 7. Configuration lessons (do not regress)

1. **gitleaks on push only** — fails on `pull_request` without PR-write perms.
2. **GitHub Actions "create/approve PRs"** must be enabled at the repo level or the Release workflow
   can't open the Version Packages PR (`PUT /actions/permissions/workflow`).
3. **Prisma binary targets** — `["native","rhel-openssl-3.0.x"]` or the client crashes on Linux
   runtimes (Vercel/CI).
4. **Restricted DB role in CI** — grant `aioi_app` login so RLS is actually tested, not bypassed.
5. **`--frozen-lockfile` everywhere** — reproducible installs; a drifted lockfile fails CI.
6. **Default workflow permissions stay `read`**; jobs that need write request it explicitly at the job
   level.

## 8. Adding a workflow / gate

- New quality gate → add a step to the `quality` job (keep it deterministic and secret-free, or gate it
  behind a secret with a safe no-op).
- New scheduled job → new workflow with `schedule` + `workflow_dispatch` (+ a `dry_run` input), idempotent,
  self-skipping when its secret is unset (mirror `deliver-alerts.yml`).
- Document the secret in [ENV_SETUP](../10-setup/ENV_SETUP.md).
