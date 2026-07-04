# Workflow — Bug Fix

1. **Reproduce** — write a failing test that captures the bug.
2. **Branch** — `fix/<slug>` off `development`.
3. **Fix** — smallest change that makes the test pass; no unrelated refactors.
4. **Verify** — full gate green; add a changeset if a package changed.
5. **PR** — into `development` with root-cause note.

## Definition of done
Green CI (format·lint·typecheck·test·build·security) · tests updated · docs/CHANGELOG/changeset
updated · PR into `development` reviewed. See [CODE_GUIDELINES §9](../../docs/08-quality/CODE_GUIDELINES.md).
