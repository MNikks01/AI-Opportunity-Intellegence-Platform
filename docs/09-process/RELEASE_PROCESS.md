# Release Process

**Status: active · Last updated: 2026-07-04**

Versioning: [SemVer](https://semver.org). Release notes: [Changesets](https://github.com/changesets/changesets)
→ per-package `CHANGELOG.md`. Packages are `private` (not published to npm); Changesets is used for
versioning + changelogs only.

## During development (every PR into `development`)

1. Add a changeset describing the change: `pnpm changeset` (pick packages + bump + summary).
2. Update root `CHANGELOG.md` `[Unreleased]` if it's a notable change.
3. CI must be green.

## Cutting a release (`development` → `main`)

1. A maintainer opens a **`development` → `main`** PR (the "release PR"). Review the aggregated diff.
2. On merge to `main`, the **Release** workflow (`.github/workflows/release.yml`) runs Changesets
   and opens a **"Version Packages"** PR that:
   - applies version bumps from pending changesets,
   - updates each affected package's `CHANGELOG.md`,
   - deletes consumed changeset files.
3. Review + merge the Version Packages PR. This commit is the release.
4. Tag it: `git tag vX.Y.Z && git push --tags` (or automate via the action once publishing is set up).

## Baseline

- `v0.0.0` — initial baseline (pre-release): full docs + monorepo + working critical path
  (ingest → score → persist → serve → render).

## Hotfix release

1. `hotfix/<slug>` off `main` → PR into `main` (include a `patch` changeset).
2. Merge → Version Packages PR bumps patch → tag.
3. Back-merge `main` → `development`.

## Rollback

- Revert the release commit on `main` (or redeploy the previous tag). Database migrations must be
  backward-compatible (expand/contract) so a rollback doesn't break the older app — see
  DATABASE_DESIGN + the migration-auditor skill.
