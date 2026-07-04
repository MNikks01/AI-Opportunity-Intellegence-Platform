# Branching Strategy

**Status: active · Last updated: 2026-07-04**

A GitFlow-lite model: a stable `main`, an integration `development`, short-lived topic branches, and
`hotfixes` for urgent production fixes.

## Long-lived branches

| Branch        | Role                                                          | Deploys to | Protected |
| ------------- | ------------------------------------------------------------- | ---------- | --------- |
| `main`        | Stable / release. Every commit is a candidate for production. | production | ✅        |
| `development` | Integration. Feature/fix PRs land here first.                 | staging    | ✅        |
| `hotfixes`    | Base for urgent production fixes (branched off `main`).       | —          | ✅        |

## Topic branches

| Prefix     | Branch off    | PR into       | For                     |
| ---------- | ------------- | ------------- | ----------------------- |
| `feat/*`   | `development` | `development` | new features            |
| `fix/*`    | `development` | `development` | non-urgent bug fixes    |
| `chore/*`  | `development` | `development` | tooling, deps, docs, ci |
| `hotfix/*` | `main`        | `main`        | urgent production fixes |

## Flow

```
feat/x ──PR──▶ development ──(release PR)──▶ main ──tag──▶ prod
                   ▲                            │
                   └──────── back-merge ────────┘   (after a hotfix)
hotfix/y (off main / hotfixes) ─────PR─────▶ main
```

1. Cut `feat/<slug>` from `development`; commit (Conventional Commits) + a changeset.
2. Open a PR into `development`. CI runs (format · lint · typecheck · test · build · security).
   Requires review (CODEOWNERS) + green CI. Squash-merge.
3. To release: open a **`development` → `main`** PR (done manually by a maintainer). On merge to
   `main`, the Release workflow opens a "Version Packages" PR (Changesets); merging it tags the version.
4. **Hotfix:** branch from `main` (via `hotfixes`), PR into `main`, then back-merge `main` →
   `development` so the fix isn't lost.

## Protection rules (configure in GitHub → Settings → Branches)

- `main` and `development`: require PR, require CI to pass, require ≥1 review, no direct pushes,
  linear history (squash), dismiss stale approvals.
- `main` additionally: restrict who can merge (maintainers), require branches up to date.

## Conventions

- Conventional Commits (enforced by commitlint via Husky `commit-msg`).
- One logical change per PR; keep them reviewable.
- Every package-behavior change ships a changeset.
