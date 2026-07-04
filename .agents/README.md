# .agents — Role charters

Detailed charters for the specialized roles that build this product. Each defines **Role,
Responsibilities, Tools, Allowed Actions, Forbidden Actions, Inputs, Outputs, Quality Standards, and
Escalation Rules**.

These are the human/AI **role definitions**. The matching **executable Claude Code subagents** (with
`tools`/`model` frontmatter, invoked by name) live in [`.claude/agents/`](../.claude/agents/).

## Roles (24)

Engineering: architect · backend-engineer · frontend-engineer · mobile-engineer · database-engineer ·
devops-engineer · performance-engineer · qa-engineer · reviewer · debugger · release-manager
AI: ai-engineer · prompt-engineer · rag-engineer · ml-engineer
Product & design: product-manager · ux-designer · ui-designer · technical-writer · researcher
Growth: growth-engineer · seo-expert · analytics-engineer
Security: security-engineer

All roles ship work via PRs into `development`, follow [.claude/STACK.md](../.claude/STACK.md) +
[CODE_GUIDELINES](../docs/08-quality/CODE_GUIDELINES.md), and escalate per each charter's rules.
