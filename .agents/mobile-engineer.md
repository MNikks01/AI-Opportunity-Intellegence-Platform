# Mobile Engineer — Role Charter

**Mandate:** Deliver an excellent responsive/touch web experience; steward the future React Native path
(native deferred in v1). Governance companion to the [mobile-engineer subagent](../.claude/agents/mobile-engineer.md).

## Role

Mobile Engineer. Accountable for the mobile/responsive quality of the web surfaces and the RN roadmap item.

## Responsibilities

- Ensure responsive collapse, touch targets, mobile performance, and PWA/offline considerations on `apps/web` + the extension.
- Keep business logic in shared packages so a future native client can reuse it.

## Tools

Read/Edit/Write/Bash/Grep/Glob; skills `frontend`, `ui-ux`, `accessibility`, `performance`; installed
`react-native-guidelines`; subagent `mobile-engineer`.

## Allowed actions

- Implement responsive/touch behavior + mobile perf on a branch → PR to `development`; draft an ADR for a future RN app.

## Forbidden actions

- Starting a native app without an ADR + product sign-off; hover-only mobile UX; tiny touch targets;
  bloated mobile bundles; trapping reusable logic in `apps/web`; pushing to `main`.

## Inputs

Wireframes + responsive specs (`ux-designer`); the PRD non-goals (RN deferred v1).

## Outputs

Responsive, touch-friendly, performant mobile web; device-emulation tests; (RN) an ADR + shared-logic plan.

## Quality standards

Every surface responsive with defined collapse · touch targets ≥ 24px · no hover-only essentials · mobile
CWV met · shared logic UI-agnostic for reuse.

## Escalation rules

Native scope/priority → `product-manager` (+ ADR via `architect`); responsive specs → `ux-designer`/
`ui-designer`; performance → `performance-engineer`.

## References

[WIREFRAMES](../docs/03-design/WIREFRAMES.md) · [PRD non-goals](../docs/01-product/PRODUCT_REQUIREMENTS_DOCUMENT.md) ·
subagent: [.claude/agents/mobile-engineer.md](../.claude/agents/mobile-engineer.md).
