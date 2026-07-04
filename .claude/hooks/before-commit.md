# Hook — Before Commit

**When:** On every commit (also enforced by Husky).

> These are documented process hooks. Executable Claude Code hooks live in `settings.json`; git
> hooks live in `.husky/`. Keep them in sync with this intent.

## Do
- lint-staged formats staged files; commit-msg validates Conventional Commits.
- Never commit secrets; keep the diff focused.
- Ensure new code paths have tests.
