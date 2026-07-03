# CLAUDE.md — Working conventions for AI assistants

Guidance for Claude Code (and other agents) working in this repository. Read before making changes.

## Project
AI Opportunity Intelligence Platform — see [README](README.md), [PRD](docs/01-product/PRODUCT_REQUIREMENTS_DOCUMENT.md),
[TRD](docs/01-product/TECHNICAL_REQUIREMENTS_DOCUMENT.md). We build **docs before code, phase by phase**
per [ROADMAP](docs/09-process/ROADMAP.md). Do not skip phases; do not add placeholder architecture.

## Engineering principles (adapted from Karpathy's LLM-coding guidance)
1. **Think before coding.** Surface assumptions and ask when genuinely underspecified — don't guess
   silently. State the decision you're making and why.
2. **Simplicity first.** No speculative features or abstractions. Build what the current phase needs.
   Prefer the MVP-optimized choices in the TRD; each has a documented exit ramp — don't pre-optimize.
3. **Surgical changes.** Touch only what the task requires. Don't refactor unrelated code in passing.
4. **Goal-driven execution.** Turn tasks into verifiable success criteria; run the check (tests,
   `verify`, `llm-eval-harness`) before claiming done. Report failures honestly.

## Standards (baseline; full versions land in Phase 18)
- **TypeScript strict**, no `any` at boundaries — validate external input with Zod (`packages/validation`).
- Shared schema, one source: RHF + tRPC + REST + ingestion all consume the same Zod schemas.
- Every mutating/privileged action writes an **audit-log** entry and passes an **RBAC** check.
- All model calls go through `packages/ai-sdk` (LiteLLM); never call a provider SDK directly.
- **No prompt/model/RAG change** without a green `llm-eval-harness` run.
- Conventional Commits; small PRs; tests + a11y for UI; secrets never in code.

## Skills to use (installed)
- **Design/UI:** `web-design-guidelines`, `frontend-design`, `ui-ux-pro-max`, `vercel-composition-patterns`,
  `vercel-react-best-practices`, `emil-design-eng`/`review-animations`/`animation-vocabulary` (motion),
  `brandkit`/`design-taste-frontend`/`minimalist-ui`/`theme-factory` (identity), `image-to-code`.
- **Docs:** `writing-guidelines`. **MCP:** `mcp-builder`. **Testing:** `webapp-testing`, `verify`.
- **Product-core (custom, in `.claude/skills/`):** `data-source-integration`, `opportunity-scoring-engine`,
  `llm-eval-harness`. **Discovery:** `find-skills`. **Skill authoring:** `skill-creator`.
- **Review:** built-in `/code-review`, `/security-review`. Consider installing `trailofbits/skills`.

## Data-source rule (non-negotiable)
No connector ships without a legality classification (see the `data-source-integration` skill). No
ToS-violating scraping (X/LinkedIn/unofficial Google Trends). Official/licensed sources only.

## When unsure
Check the ROADMAP for the current phase and the relevant `docs/` file. If a decision isn't recorded,
propose an ADR in `docs/adr/` rather than deciding silently in code.
