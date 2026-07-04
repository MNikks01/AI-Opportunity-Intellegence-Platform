# Workflow — Code Review

1. Run `/code-review` on the diff (correctness + simplification).
2. Verify security (RBAC/validation/secrets) and tests.
3. Confirm docs/CHANGELOG/changeset updated.
4. Request changes or approve; require green CI before merge.

## Definition of done
Green CI (format·lint·typecheck·test·build·security) · tests updated · docs/CHANGELOG/changeset
updated · PR into `development` reviewed. See [CODE_GUIDELINES §9](../../docs/08-quality/CODE_GUIDELINES.md).
