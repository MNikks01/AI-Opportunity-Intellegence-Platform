---
name: devops
description: >-
  Deep DevOps guidance for the AI Opportunity Intelligence Platform — GitHub Actions CI/CD, Changesets
  releases, Terraform IaC, environments, and deployment to Vercel + Fly.io (→ AWS at scale). Use when
  editing workflows, the release pipeline, IaC, environment/secret wiring, or deploy/rollback. Encodes
  the real, hard-won lessons from this repo's pipeline (gitleaks-on-push, dependabot groups, Actions
  create-PR permission, Prisma generate).
---

# DevOps & CI/CD

Pipelines gate every change; releases are automated via Changesets; infra is reproducible via
Terraform. Branch model is GitFlow-lite: `main` (stable) · `development` (integration) · `hotfixes`;
CI runs on push to those + PRs. This skill bakes in the specific gotchas we already hit. See
[INFRASTRUCTURE](../../../docs/06-infra/INFRASTRUCTURE.md), [BRANCHING_STRATEGY](../../../docs/09-process/BRANCHING_STRATEGY.md),
[RELEASE_PROCESS](../../../docs/09-process/RELEASE_PROCESS.md).

## When to apply

- Editing `.github/workflows/*`, the release pipeline, or dependabot config.
- Writing/changing Terraform, environments, or secret wiring.
- Deploying, rolling back, or debugging a red pipeline.

## Rule categories by priority

| Priority | Category | Why |
|---|---|---|
| **CRITICAL** | Green, meaningful gates | CI must actually catch regressions, and it must pass. |
| **CRITICAL** | Secrets & least privilege | Static keys / broad tokens are a breach waiting to happen. |
| **CRITICAL** | Safe deploys & rollback | A bad deploy must be reversible fast; migrations backward-compatible. |
| **HIGH** | Reproducible IaC | Click-ops drifts; infra is code, versioned + reviewed. |
| **HIGH** | Pinned supply chain | Unpinned actions/images = supply-chain risk. |
| **MEDIUM** | Release automation | Changesets → Version Packages PR → tag. |
| **MEDIUM** | Caching & speed | Fast CI keeps the loop tight. |

## Repo-specific gotchas (already learned — don't re-break)

- **gitleaks-action runs on `push` only** — it fails on `pull_request` events (needs PR-write perms,
  incl. dependabot's read-only token). Every push to protected branches is scanned.
- **Dependabot groups = minor/patch only**; `prisma`/`@prisma/client` majors are ignored (Prisma 5→7 is
  a deliberate migration, B-025). Majors arrive as individual PRs.
- **`@aioi/database` has `postinstall: prisma generate`** — without it, fresh CI installs fail; CI also
  runs `prisma migrate deploy` before tests.
- **Changesets Release** needs repo setting *Actions → Allow GitHub Actions to create and approve PRs*
  enabled, or the Version Packages PR can't open.
- **pnpm `node-linker=hoisted`** so shared dev tooling (vitest/eslint) resolves across workspaces.

## Quick reference — the rules

### 1. Meaningful, green gates (CRITICAL)
- PR gate: install → prisma migrate deploy → format:check → lint → typecheck → test → build; plus a
  security job (dependency audit + gitleaks on push). Gates must be real, not `|| true` (except
  advisory audit). Fix flakiness at the source.

### 2. Secrets & least privilege (CRITICAL)
- Secrets via GitHub/Environment secrets or a secret manager; never in code/logs. **OIDC** to cloud
  (no static AWS keys). Set job-level `permissions:` minimally; grant write only where needed.

### 3. Safe deploys & rollback (CRITICAL)
- Deploy only on green CI. Migrations are expand/contract (backward-compatible) so the old app survives
  a rollback. Health/readiness gate traffic; auto-rollback on failed smoke; keep the previous release tagged.

### 4. Reproducible IaC (HIGH)
- Terraform for DNS (Cloudflare), R2 buckets, managed Postgres/Redis, env wiring; remote locked state;
  environments as workspaces; least-privilege IAM. No manual console changes.

### 5. Pinned supply chain (HIGH)
- Pin action versions + image digests; gitleaks secret scan; `pnpm audit`; license/SBOM in CI;
  dependabot keeps them fresh (safely grouped).

### 6. Release automation (MEDIUM)
- Every package change ships a changeset. `development → main` PR (manual) → Release workflow opens the
  Version Packages PR → merge to bump versions/changelogs → tag `vX.Y.Z`.

### 7. Speed (MEDIUM)
- pnpm + setup-node cache; Turborepo remote/local cache; concurrency `cancel-in-progress`. Keep jobs parallel.

## Patterns — good vs bad

**CI triggers + Prisma + gitleaks-on-push:**
```yaml
# ✅ GOOD — right branches; migrate before tests; gitleaks only on push
on:
  push: { branches: [main, development, hotfixes] }
  pull_request: { branches: [main, development] }
# quality job: pnpm install --frozen-lockfile; pnpm --filter @aioi/database exec prisma migrate deploy; ...
# security job: gitleaks step -> if: github.event_name == 'push'
```

**OIDC to AWS (no static keys):**
```yaml
# ✅ GOOD
permissions: { id-token: write, contents: read }
- uses: aws-actions/configure-aws-credentials@v4
  with: { role-to-assume: ${{ vars.AWS_DEPLOY_ROLE }}, aws-region: us-east-1 }
```

```yaml
# ❌ BAD — static long-lived cloud creds in secrets
env: { AWS_ACCESS_KEY_ID: ${{ secrets.AWS_KEY }}, AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET }} }
```

## Step-by-step: change the pipeline / deploy

1. Edit workflow/IaC on a `chore/*` branch → PR into `development`.
2. Keep gitleaks push-only; ensure prisma generate/migrate steps; pin actions.
3. For deploys: verify green CI + backward-compatible migration; deploy; run smoke; keep rollback ready.
4. For releases: ensure changesets present; merge `development→main`; merge the Version Packages PR; tag.
5. Update INFRASTRUCTURE/RELEASE docs + CHANGELOG.

## Failure modes → fixes (seen here)

| Symptom | Cause | Fix |
|---|---|---|
| CI red on every PR (security job) | gitleaks on `pull_request` | run gitleaks on `push` only |
| Dependabot PRs fail install | grouped breaking major (Prisma 7) | groups = minor/patch; ignore prisma major |
| Fresh CI install fails | prisma client not generated | `postinstall: prisma generate` |
| Integration tests fail in CI | schema not applied | `prisma migrate deploy` before tests |
| Release PR never opens | Actions can't create PRs | enable the repo setting |
| Supply-chain risk | unpinned actions/images | pin digests; gitleaks; audit |

## Pre-delivery checklist

- [ ] CI triggers on push `main/development/hotfixes` + PRs to `main/development`
- [ ] Gates: install → migrate deploy → format → lint → typecheck → test → build; gitleaks on push only
- [ ] Secrets via secrets/manager; OIDC to cloud; minimal job `permissions`
- [ ] Actions + image digests pinned; audit/SBOM; dependabot safely grouped
- [ ] Deploys gated on green CI; migrations backward-compatible; rollback verified; smoke check
- [ ] Terraform reviewed; remote locked state; least-privilege IAM; no click-ops
- [ ] Changeset present; release flow (Version Packages PR → tag) works
- [ ] INFRASTRUCTURE/RELEASE docs + CHANGELOG updated

## References
[INFRASTRUCTURE](../../../docs/06-infra/INFRASTRUCTURE.md) · [BRANCHING_STRATEGY](../../../docs/09-process/BRANCHING_STRATEGY.md) ·
[RELEASE_PROCESS](../../../docs/09-process/RELEASE_PROCESS.md) · [lessons](../../memory/lessons.md) · skills: `docker`, `kubernetes`, `security`.
