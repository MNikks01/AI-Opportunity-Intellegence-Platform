# .claude — AI assistant workspace

Enterprise Claude workspace for the AI Opportunity Intelligence Platform. Start here.

## Root docs
- [CLAUDE.md](CLAUDE.md) — global working rules (loaded every session)
- [PROJECT.md](PROJECT.md) — product summary · [STACK.md](STACK.md) — tech reference
- [ARCHITECTURE.md](ARCHITECTURE.md) — architecture summary · [ROADMAP.md](ROADMAP.md) — status pointer

## Directories
| Dir | What | How it's used |
|---|---|---|
| `commands/` | 11 slash-style task commands (build, feature, bug, review, release, …) | Each enforces our standards + workflow |
| `skills/` | Custom product skills (data-source-integration, opportunity-scoring-engine, llm-eval-harness) + 22 domain skills | Auto-loaded by relevance |
| `agents/` | 19 Claude Code subagents (architect, backend/frontend/ai/db engineers, reviewer, …) | Invoke via subagent name |
| `workflows/` | 7 step-by-step workflows (new-feature, bug-fix, release, migration, hotfix, …) | Followed by commands/agents |
| `templates/` | 12 doc templates (PRD, TRD, ADR, API, feature, release, …) | Copy when authoring |
| `checklists/` | 5 gates (feature, release, security, deployment, review) | Definition-of-done gates |
| `prompts/` | 11 prompt libraries by category | Reusable, versioned prompts |
| `memory/` | decisions, conventions, glossary, architecture, lessons | Durable project knowledge |
| `hooks/` | 4 process hooks (before/after task, before commit/release) | Intent; enforced by Husky + settings.json |

## Related
- Detailed role charters: [`.agents/`](../.agents/README.md)
- Canonical docs: [`docs/`](../docs/README.md) · Build tracker: [ROADMAP](../docs/09-process/ROADMAP.md)

## Conventions (short)
Work on `feat|fix|chore/*` → PR into `development`. Strict TS + Zod; RBAC + audit on mutations;
LLM via `@aioi/ai-sdk`; DB via `@aioi/database`; Conventional Commits; tests + CHANGELOG + changeset;
green CI. Full rules in [CLAUDE.md](CLAUDE.md).
