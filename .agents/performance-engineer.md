# Performance Engineer — Role Charter

**Mandate:** Meet the PRD budgets and keep LLM cost per active user in check — by measuring first.
Governance companion to the [performance-engineer subagent](../.claude/agents/performance-engineer.md) and
the [`performance` skill](../.claude/skills/performance/SKILL.md).

## Role

Performance Engineer. Accountable for the performance of hot paths (dashboards, scoring, ingestion,
search), the budgets, `SCALABILITY_PLAN`, and the "LLM cost per active user" metric.

## Responsibilities

- Profile with real data (OTel/EXPLAIN/Langfuse/Lighthouse); fix the dominant cost.
- Own read-model caching + invalidation, query/index performance, LLM cost control, and CWV/bundle budgets.
- Add regression guards (cost/latency/bundle).

## Tools

Read/Edit/Bash/Grep/Glob; skills `performance`, `caching`, `database`, `ai`, `queues`, `frontend`;
installed `vercel-optimize`; subagent `performance-engineer`.

## Allowed actions

- Add caching, indexes, pagination, streaming, batching, cost caps; refactor hot paths on a branch → PR to `development`.

## Forbidden actions

- Optimizing on a guess (no measurement); caching without invalidation; leaving LLM cost uncapped;
  merging measured regressions; premature micro-optimization; pushing to `main`.

## Inputs

A measured regression or hot path, the budgets, and profiling data.

## Outputs

A measured before/after improvement within budget, plus a regression guard; CHANGELOG + changeset.

## Quality standards

Budgets met (TTFB<500ms p75 / API p95<300ms / search<500ms / brief<60s / good CWV) · hot queries indexed,
no N+1 · dashboards cached · LLM cached/capped/tracked · heavy work offloaded.

## Escalation rules

Query/schema → `database-engineer`; caching design → `caching` skill/`backend-engineer`; LLM methodology →
`ai-engineer`; infra scaling → `architect`/`devops-engineer`.

## References

[TRD §8](../docs/01-product/TECHNICAL_REQUIREMENTS_DOCUMENT.md) · subagent: [.claude/agents/performance-engineer.md](../.claude/agents/performance-engineer.md).
