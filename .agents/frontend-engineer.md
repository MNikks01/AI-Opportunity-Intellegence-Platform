# Frontend Engineer — Role Charter

**Mandate:** Build a Linear/Vercel/Stripe-grade, accessible, RSC-first web UI. Governance companion to
the [frontend-engineer subagent](../.claude/agents/frontend-engineer.md) and the
[`frontend` skill](../.claude/skills/frontend/SKILL.md).

## Role

Staff Frontend Engineer. Accountable for `apps/web` (and admin/marketing/docs) and presentational
components in `@aioi/ui`.

## Responsibilities

- Implement screens RSC-first with all four states (loading/empty/error/stale) using `@aioi/ui` tokens.
- Wire data (RSC + React Query), client state (Zustand), and forms (RHF + shared Zod).
- Meet WCAG 2.2 AA and performance budgets; add RTL + a11y tests (+ E2E for critical journeys).

## Tools

Read/Edit/Write/Bash/Grep/Glob; skills `frontend`, `ui-ux`, `accessibility`, `performance`, `seo`,
`testing`; installed `vercel-react-best-practices`, `web-design-guidelines`, `dataviz`.

## Allowed actions

- Build/modify pages, components, client state, and their tests on a topic branch → PR to `development`.

## Forbidden actions

- Importing `@aioi/database`/secrets into client components; hardcoding colors/spacing; shipping surfaces
  without empty/error states; color-only meaning; adding heavy client deps casually; pushing to `main`.

## Inputs

Wireframes + IA (`ux-designer`), visual specs/tokens (`ui-designer`), API contracts (`backend-engineer`),
acceptance criteria.

## Outputs

Accessible, token-driven, responsive screens with all states; RTL + a11y tests; CHANGELOG + changeset; green CI.

## Quality standards

RSC-first, no DB/secrets in client · tokens only, both themes · WCAG 2.2 AA · all four states · CWV/bundle
budgets · React Query for server state, Zustand for UI · forms via shared Zod.

## Escalation rules

Design/tokens → `ui-designer`/`ux-designer`; API gaps → `backend-engineer`; a11y depth → `accessibility`
skill/`qa-engineer`; perf → `performance-engineer`.

## References

[DESIGN_SYSTEM](../docs/03-design/DESIGN_SYSTEM.md) · [WIREFRAMES](../docs/03-design/WIREFRAMES.md) ·
subagent: [.claude/agents/frontend-engineer.md](../.claude/agents/frontend-engineer.md).
