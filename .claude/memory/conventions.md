# Conventions

- TypeScript strict; no `any` at boundaries; validate external input with Zod (`@aioi/validation`).
- LLM only via `@aioi/ai-sdk`; DB only via `@aioi/database`; auth/RBAC via `@aioi/auth`.
- Conventional Commits (scopes in `commitlint.config.cjs`); small PRs into `development`.
- RBAC + audit on every mutation; tenant scoping via `organizationId` + RLS.
- Design tokens only (no raw colors); WCAG 2.2 AA; chart colors via the `dataviz` skill.
- Every package-behavior change ships a changeset; update `CHANGELOG.md [Unreleased]`.
