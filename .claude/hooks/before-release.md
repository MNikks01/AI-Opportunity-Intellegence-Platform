# Hook — Before Release

**When:** Before promoting `development → main`.

> These are documented process hooks. Executable Claude Code hooks live in `settings.json`; git
> hooks live in `.husky/`. Keep them in sync with this intent.

## Do
- Confirm every PR has a changeset and CHANGELOG is current.
- Ensure CI is green on `development`; migrations are backward-compatible.
- Prepare rollback; verify observability.
