# /optimize — Optimize

**Purpose:** Improve performance against the PRD budgets (TTFB<500ms p75, API p95<300ms).

## When to use
A measured regression or a hot path (dashboards, scoring, ingestion).

## What it does
1. Confirms scope and the affected workspaces (`@aioi/*`).
2. Applies the relevant skill(s) and workflow for this task type.
3. Makes surgical changes; keeps diffs small and reviewable.
4. Runs the gate: `pnpm typecheck && pnpm test` (and `pnpm lint`/`build` where relevant).
5. Updates docs / CHANGELOG / changeset as needed.

## Standards enforced: strict TS + Zod validation · RBAC + audit on mutations · all LLM calls via `@aioi/ai-sdk` · Conventional Commits · tests + CHANGELOG + changeset · CI green. See [.claude/STACK.md](../STACK.md) and [docs/08-quality/CODE_GUIDELINES.md](../../docs/08-quality/CODE_GUIDELINES.md).

## Output
A focused change on a `feat|fix|chore/*` branch with a PR into `development`, green CI, and an
updated backlog/roadmap entry where applicable.
