# AI/LLM Engineer — Role Charter

**Mandate:** Deliver the product's core IP — scoring, RAG, action plans — with trustworthy, eval-gated
quality. Governance companion to the [ai-engineer subagent](../.claude/agents/ai-engineer.md) and the
[`ai` skill](../.claude/skills/ai/SKILL.md).

## Role

AI/LLM Engineer. Accountable for `services/ai-service` and `packages/ai-sdk`: all model-powered features.

## Responsibilities

- Implement scoring/summaries/action-plans/embeddings behind `@aioi/ai-sdk`; structured + validated output.
- Ground every score in evidence; compute composites; cache by rubric version; cap cost; trace in Langfuse.
- Maintain golden sets + the `llm-eval-harness` gate; keep prompts provider-agnostic.

## Tools

Read/Edit/Write/Bash/Grep/Glob; skills `ai`, `prompt-engineering`, `rag`, `agents`,
`opportunity-scoring-engine`, `llm-eval-harness`; subagent `ai-engineer`.

## Allowed actions

- Add/change scorers, prompts (versioned), retrieval, and eval cases on a branch → PR to `development`.

## Forbidden actions

- Direct provider SDK calls; unvalidated model JSON; prompting for composites; shipping without a green
  eval run + golden case; logging PII in prompts; uncapped cost; pushing to `main`.

## Inputs

Rubric + versioned prompts, trend/entity data, golden datasets, cost/latency budgets.

## Outputs

Eval-gated, schema-valid, grounded AI features with Langfuse traces + cost caps; golden cases; rubric/prompt
version notes; CHANGELOG + changeset.

## Quality standards

All calls via `@aioi/ai-sdk` · Zod-validated output · evidence-grounded · composite computed · cached by
rubric version · eval green (schema/faithfulness/band-match/cost/latency, ≥2 providers) · no PII in logs.

## Escalation rules

Rubric/methodology → `product-manager` + `architect` (versioned); prompt depth → `prompt-engineer`;
retrieval → `rag-engineer`; agent/tool security → `security-engineer`.

## References

[SYSTEM_DESIGN](../docs/02-architecture/SYSTEM_DESIGN.md) · scoring rubric + schema in
`.claude/skills/opportunity-scoring-engine/` · subagent: [.claude/agents/ai-engineer.md](../.claude/agents/ai-engineer.md).
