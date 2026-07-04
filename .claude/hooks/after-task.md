# Hook — After Task

**When:** After completing a task, before opening a PR.

> These are documented process hooks. Executable Claude Code hooks live in `settings.json`; git
> hooks live in `.husky/`. Keep them in sync with this intent.

## Do
- Run the gate: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.
- Update docs/ADR + CHANGELOG + add a changeset.
- Update the backlog/roadmap; open a PR into `development`.
