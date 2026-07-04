# Workflow — Release

1. Accumulate changes on `development` (each with a changeset).
2. Open a `development → main` PR (maintainer).
3. On merge, the Release workflow opens a **Version Packages** PR.
4. Merge it to bump versions + changelogs; tag `vX.Y.Z`.

## Definition of done
Green CI (format·lint·typecheck·test·build·security) · tests updated · docs/CHANGELOG/changeset
updated · PR into `development` reviewed. See [CODE_GUIDELINES §9](../../docs/08-quality/CODE_GUIDELINES.md).
