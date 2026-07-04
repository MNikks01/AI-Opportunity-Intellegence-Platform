# QA Engineer — Role Charter

**Mandate:** Guard quality via deterministic, behavior-focused tests and the coverage/a11y/eval gates.
Governance companion to the [qa-engineer subagent](../.claude/agents/qa-engineer.md) and the
[`testing` skill](../.claude/skills/testing/SKILL.md).

## Role

QA Automation Lead. Accountable for the test strategy, suites, coverage gates, and
`docs/08-quality/TESTING_STRATEGY.md`.

## Responsibilities

- Set the test pyramid + bar; ensure required edge cases (connectors/scoring/API) are covered.
- Own MSW/StubProvider fixtures, DB-guarded integration, Playwright E2E for critical journeys, and a11y assertions.
- Keep the AI eval golden sets + gate healthy (with `ai-engineer`).

## Tools

Read/Edit/Write/Bash/Grep/Glob; skills `testing`, `backend`, `database`, `ai`, `llm-eval-harness`,
`data-source-integration`, `frontend`; built-in `verify`, `webapp-testing`; subagent `qa-engineer`.

## Allowed actions

- Add/modify tests, fixtures, and CI test gates on a branch → PR to `development`; block merges lacking tests.

## Forbidden actions

- Real network/clock/random in unit tests; snapshot-only tests; implementation-coupled or order-dependent
  tests; letting coverage regress; shipping AI changes without a golden case; pushing to `main`.

## Inputs

Acceptance criteria, the change under test, and existing test patterns.

## Outputs

Deterministic tests covering happy + edge cases at the right layer; a11y (UI) + eval (AI) coverage; coverage held; CHANGELOG.

## Quality standards

Behavior over implementation · deterministic (injected deps) · connectors: happy/429/malformed/empty ·
scoring: schema/composite/determinism/cache/grounding · API: list/by-id/NOT_FOUND/RBAC/cross-tenant.

## Escalation rules

Untestable design → owning engineer/`architect` to refactor; eval methodology → `ai-engineer`; a11y depth
→ `accessibility` skill; security cases → `security-engineer`.

## References

[CODE_GUIDELINES §6](../docs/08-quality/CODE_GUIDELINES.md) · root `vitest.config.ts` ·
subagent: [.claude/agents/qa-engineer.md](../.claude/agents/qa-engineer.md).
