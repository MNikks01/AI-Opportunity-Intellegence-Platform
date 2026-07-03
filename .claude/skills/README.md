# Custom Claude Skills

House skills for the AI Opportunity Intelligence Platform. These encode workflows the base
model and the public registry can't — they are the areas identified as gaps in
[`../../SKILLS_ADOPTION_REPORT.md`](../../SKILLS_ADOPTION_REPORT.md) (Phase 5).

Each is a standard [Agent Skill](https://code.claude.com/docs/en/skills): a folder with a
`SKILL.md` (YAML frontmatter + instructions) plus optional `references/`. Claude loads them
automatically when a task matches the `description`.

| Skill | Purpose | Author with `skill-creator`? |
|---|---|---|
| [`data-source-integration`](./data-source-integration/SKILL.md) | Compliant, typed, tested ingestion connectors | ✅ scaffolded |
| [`opportunity-scoring-engine`](./opportunity-scoring-engine/SKILL.md) | Consistent, explainable, versioned AI scores (core IP) | ✅ scaffolded |
| [`llm-eval-harness`](./llm-eval-harness/SKILL.md) | Regression gate so AI quality can't silently degrade | ✅ scaffolded |

## Notes
- These are scaffolds: the `SKILL.md` instructions and reference templates are complete, but
  the paths they reference (`services/ingestion-service`, `services/ai-service/eval/`,
  `packages/ai-sdk`, `packages/shared`) will exist once the monorepo is built. Adjust paths to match.
- To add more house skills, run the official `skill-creator` skill.
- To validate a skill's frontmatter/structure, install and use `skill-creator`.
