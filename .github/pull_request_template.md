<!-- PRs target `development` (feature/fix) or `main` (release/hotfix only). See docs/09-process/BRANCHING_STRATEGY.md -->

## What & why

<!-- What does this change and why? Link the issue / backlog id (e.g. B-014). -->

Closes #

## Type of change

- [ ] feat — new feature
- [ ] fix — bug fix
- [ ] refactor / perf
- [ ] docs
- [ ] chore / ci / build
- [ ] hotfix (targets `main`)

## How was it tested?

<!-- Commands run, scenarios exercised, screenshots for UI. -->

## Checklist (Definition of Done — see docs/08-quality/CODE_GUIDELINES.md §9)

- [ ] Meets acceptance criteria; risky changes behind a feature flag
- [ ] Types strict; external input validated (Zod); RBAC + audit where applicable
- [ ] Tests added/updated and green; coverage not reduced
- [ ] AI change → `llm-eval-harness` green · migration → migration-auditor pass
- [ ] Docs/ADR updated if behavior or a decision changed
- [ ] `CHANGELOG.md` `[Unreleased]` updated
- [ ] Changeset added (`pnpm changeset`) for any package-behavior change
- [ ] CI green (format · lint · typecheck · test · build · security)
