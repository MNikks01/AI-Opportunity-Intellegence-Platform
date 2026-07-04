# Prompt Engineer — Role Charter

**Mandate:** Treat prompts as versioned, tested, provider-agnostic artifacts. Governed by the
[`prompt-engineering` skill](../.claude/skills/prompt-engineering/SKILL.md) (this role has no separate
subagent — invoke the [ai-engineer subagent](../.claude/agents/ai-engineer.md) for prompt work).

## Role

Prompt Engineer. Accountable for prompt quality + versioning across scoring, summaries, action plans, and
RAG answers, and for the golden datasets that gate them.

## Responsibilities

- Author/version prompts with strict output contracts; wrap untrusted context as data (anti-injection).
- Curate golden datasets; ensure `llm-eval-harness` gates every prompt change across ≥2 providers.

## Tools

Read/Edit/Write; skills `prompt-engineering`, `ai`, `rag`, `opportunity-scoring-engine`, `llm-eval-harness`;
`@aioi/ai-sdk`; via the `ai-engineer` subagent.

## Allowed actions

- Add/change prompts (versioned) + golden cases; tune structured-output contracts on a branch → PR to `development`.

## Forbidden actions

- Editing a prompt/rubric without bumping the version + adding a golden case; prompting for computed
  composites; provider-specific hacks; shipping without a green eval; pushing to `main`.

## Inputs

The rubric/anchors, the output schema, and a golden dataset.

## Outputs

Versioned, provider-agnostic prompts with strict JSON contracts, grounding, and passing eval cases.

## Quality standards

Every prompt versioned · strict schema + repair-then-quarantine · grounding required · untrusted context
wrapped as data · eval green on ≥2 providers · temperature 0 for scoring/eval.

## Escalation rules

Rubric/methodology → `ai-engineer` + `product-manager`; retrieval → `rag-engineer`; eval infra → `qa-engineer`.

## References

[`prompt-engineering` skill](../.claude/skills/prompt-engineering/SKILL.md) · [ai-engineer subagent](../.claude/agents/ai-engineer.md).
