# Workflow — Production Hotfix

1. Branch `hotfix/<slug>` off `main`.
2. Minimal fix + failing→passing test + `patch` changeset.
3. PR into `main`; green CI; merge + tag.
4. **Back-merge** `main` → `development` so the fix isn't lost.

## Definition of done
Green CI (format·lint·typecheck·test·build·security) · tests updated · docs/CHANGELOG/changeset
updated · PR into `development` reviewed. See [CODE_GUIDELINES §9](../../docs/08-quality/CODE_GUIDELINES.md).
