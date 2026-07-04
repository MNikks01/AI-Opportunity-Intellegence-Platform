# Workflow — New Feature

1. **Plan** — restate the backlog item + acceptance criteria; note affected `@aioi/*` packages; call out risks/ADRs.
2. **Branch** — `feat/<slug>` off `development`.
3. **Build** — smallest vertical slice first; apply relevant skills; strict TS + Zod; RBAC + audit.
4. **Test** — unit + integration/E2E; a11y for UI; eval for AI.
5. **Docs** — update docs/ADR/CHANGELOG; add a changeset.
6. **PR** — into `development`; `/code-review`; green CI.

## Definition of done
Green CI (format·lint·typecheck·test·build·security) · tests updated · docs/CHANGELOG/changeset
updated · PR into `development` reviewed. See [CODE_GUIDELINES §9](../../docs/08-quality/CODE_GUIDELINES.md).
