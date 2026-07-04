# Lessons learned

- **gitleaks-action** fails on `pull_request` events (needs PR-write perms) — run it on `push` only.
- **Dependabot grouped updates** can bundle breaking majors (e.g. Prisma 5→7) → limit groups to
  minor/patch and pin risky majors; adopt majors deliberately (see BACKLOG B-025).
- **Actions→create-PR** must be enabled (Settings→Actions) for the Changesets Release PR to open.
- **pnpm workspace tools** (vitest/eslint) resolve cleanly with `node-linker=hoisted`.
- **Prisma client** must be generated (`postinstall: prisma generate`) or CI install fails.
