# Prompts — code-review

Reusable prompt snippets for **diff review** on this project. Keep them versioned; pair AI-facing prompts
with a golden case in `llm-eval-harness`.

## Starters
- "Given [context in docs/], diff review: … Constrain to [scope]. Enforce our standards (STACK.md)."
- "Before coding, restate assumptions and acceptance criteria for [backlog id]."

## Conventions
- Reference canonical docs by path; don't restate them.
- Prefer smallest-slice-first; surgical changes; ask when underspecified.
