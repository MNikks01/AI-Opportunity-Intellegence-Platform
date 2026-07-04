# Claude Skills Adoption Report

**Product:** AI Opportunity Intelligence Platform
**Prepared:** 2026-07-03
**Author role:** Staff AI Engineer / Claude Code consultant
**Scope:** Which Claude Skills to install for building this product — verified against real registries only.

---

## 0. Executive Summary (read this first)

I verified the actual state of the Claude Skills ecosystem before recommending anything. The most important conclusion contradicts the framing in the brief, so I'm stating it up front:

**Claude Skills are workflow and knowledge _overlays_ (SKILL.md files), not an npm-style registry of per-framework packages.** There is **no** battle-tested, official skill for "React," "Next.js," "Tailwind," "Prisma," "Fastify," "BullMQ," "Redis," "Terraform," "PostgreSQL," etc. Claude already knows those frameworks from training; a skill only adds value when it encodes an _opinionated, repeatable workflow or a house standard_ that the base model doesn't have.

Therefore:

- The Phase-2 wishlist (~90 framework names) does **not** map to ~90 installable skills. It maps to **~6–8 genuinely useful real skills**, plus a set of **custom skills you should author yourself** (your house standards), plus a large remainder that needs **no skill at all**.
- Recommending 90 skills would be hallucination. This report recommends the **minimum set with maximum coverage**, per your constraint.

**What actually exists and is worth installing (all verified):**

| Source                                                                    | What it is                                                                                                                                                                                                       | Trust           |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| [`anthropics/skills`](https://github.com/anthropics/skills)               | Official Anthropic skills (17): docx/pdf/pptx/xlsx, `webapp-testing`, `mcp-builder`, `skill-creator`, `frontend-design`, `brand-guidelines`, `theme-factory`, `web-artifacts-builder`, `claude-api`, etc. ~158k★ | Official        |
| [`vercel-labs/agent-skills`](https://github.com/vercel-labs/agent-skills) | 8 skills incl. `react-best-practices`, `web-design-guidelines`, `composition-patterns`, `writing-guidelines`, `vercel-optimize`                                                                                  | Vendor (Vercel) |
| [`trailofbits/skills`](https://github.com/trailofbits/skills)             | ~35 security/audit/testing skills (`static-analysis`, `insecure-defaults`, `differential-review`, `supply-chain-risk-auditor`, `property-based-testing`, `semgrep-rule-creator`, `modern-python`, `gh-cli`…)     | Security firm   |
| [`vercel-labs/skills`](https://github.com/vercel-labs/skills)             | The `npx skills` CLI — GitHub-as-registry installer                                                                                                                                                              | Tooling         |

**You already have several built-in** in this Claude Code session — `/code-review`, `/security-review`, `dataviz`, `artifact-design`, `verify`, `claude-api`, `webapp-testing` equivalents — so do **not** re-install those.

---

## Phase 1 — Product Capability Matrix

Extracted from the master spec.

| Domain           | Capabilities in spec                                                                                                     | Base Claude covers it?                 | Skill leverage?                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Languages**    | TypeScript (strict), SQL, Bash                                                                                           | ✅ Fully                               | Low — house lint/tsconfig standards as custom skill                                                                          |
| **Frontend**     | Next.js, React, Tailwind, shadcn/ui, React Query, Zustand, Framer Motion, RHF, Zod, TanStack Table, Recharts, React Flow | ✅ Mostly                              | **Medium** — `react-best-practices`, `web-design-guidelines`, `composition-patterns`, `frontend-design`                      |
| **Backend**      | Node, Fastify/NestJS, Prisma, PostgreSQL, Redis, BullMQ, WebSockets, tRPC/REST, OpenAPI, JWT, RBAC, audit logs           | ✅ Mostly                              | Low from registry — **custom skills** for house API/RBAC/migration standards                                                 |
| **AI**           | OpenAI, Anthropic, Gemini, OpenRouter, LiteLLM, MCP, Langfuse/OTel, RAG, embeddings, agents, prompt eng.                 | ✅ + `claude-api` skill                | **High** — `mcp-builder`, `claude-api`; **custom** for RAG/eval/prompt-registry                                              |
| **Data sources** | Google Trends, Reddit, GitHub, HN, PH, YouTube, X, HF, ArXiv, funding DBs…                                               | ✅                                     | **Custom** — one "source-integration" skill encoding rate-limit/ToS/legal checklist                                          |
| **Infra/DevOps** | Docker, Compose, GH Actions, Vercel, AWS, Cloudflare, K8s, Terraform, S3, CDN                                            | ✅ Mostly                              | Low from registry — **custom** IaC/pipeline standards; `vercel-optimize` if on Vercel                                        |
| **Databases**    | Prisma schema, Postgres, migrations, ERDs, multi-tenancy                                                                 | ✅                                     | **Custom** — `migration-auditor` style skill (locking/data-safety)                                                           |
| **Testing/QA**   | Vitest, RTL, Playwright, MSW, coverage, a11y, visual regression, load                                                    | ✅ + `webapp-testing`                  | **Medium** — `webapp-testing`; **custom** test-generation to house patterns                                                  |
| **Security**     | OWASP, RBAC, rate-limit, CSRF/CORS, JWT rotation, secrets, threat model, webhook verification                            | ✅ + `/security-review`                | **High** — `trailofbits/skills` (`static-analysis`, `insecure-defaults`, `supply-chain-risk-auditor`, `differential-review`) |
| **Performance**  | Bundle analysis, Core Web Vitals, caching, load tests                                                                    | ✅                                     | `vercel-optimize`; **custom** perf-budget skill                                                                              |
| **Docs**         | 60+ doc types (PRD, ADR, SYSTEM_DESIGN, ERD, diagrams…)                                                                  | ✅ + `writing-guidelines`              | **High** — `doc-coauthoring`, `writing-guidelines`; **custom** ADR/PRD/diagram templates                                     |
| **UI/UX**        | Design system, tokens, dark/light, a11y, dashboards                                                                      | ✅ + `frontend-design`/`theme-factory` | **Medium** — `theme-factory`, `frontend-design`, `web-design-guidelines`, built-in `dataviz`                                 |
| **Product**      | Discovery, personas, competitive analysis, PRD, roadmap, sprint                                                          | ✅                                     | **Custom** — PRD/user-story/roadmap house-format skills                                                                      |
| **Deliverables** | docx/pdf/pptx/xlsx exports (reports, weekly briefs)                                                                      | ⚠️ needs skill                         | **High** — official `docx`/`pdf`/`pptx`/`xlsx` skills (directly maps to "Weekly Reports/Email Reports" feature)              |

**Reading the matrix:** the leverage concentrates in **AI tooling, security, document generation, and design** — not in framework CRUD, which base Claude already handles.

---

## Phase 2 — Discovery: what the registry actually contains

**How the registry works (verified):** `npx skills` (the `vercel-labs/skills` CLI) treats **any public GitHub repo with a `SKILL.md` at root** as an installable skill. There is no central quality gate. Community directories exist (agentskills.io, skillsmp.com, claudedirectory.org, lobehub) but are aggregators, not curators. Agent Skills became an open standard (`agentskills.io`) in Dec 2025, adopted by ~40+ clients.

**Blunt finding per wishlist category:**

- **Frontend (React/Next/Tailwind/TS/RQ/Zustand/shadcn/Framer/a11y/SEO):** No official per-library skills. **Real hits:** `react-best-practices`, `composition-patterns`, `web-design-guidelines`, `frontend-design`. Everything else → base Claude or custom.
- **Backend (Node/Fastify/NestJS/Express/tRPC/OpenAPI/Auth/RBAC/Prisma/PG/Redis/BullMQ/WS):** **No high-quality registry skills.** All → base Claude or custom house-standard skills. Anyone claiming a "Fastify skill" or "Prisma skill" of production quality should be treated skeptically.
- **AI (OpenAI/Anthropic/Gemini/OpenRouter/LiteLLM/MCP/prompt/RAG/agents/embeddings/vector/Langfuse/OTel):** **Real hits:** `mcp-builder` (official), `claude-api` (official, also built-in here). RAG/eval/prompt-registry → custom.
- **Infra (Docker/Compose/K8s/Terraform/AWS/CF/Vercel/GH Actions/CI/monitoring/SRE):** **Real hit:** `vercel-optimize` (only if you deploy on Vercel). `trailofbits/devcontainer-setup`, `gh-cli`, `agentic-actions-auditor` (audits GH Actions). Rest → custom.
- **Quality (ESLint/Prettier/testing/Playwright/Vitest/MSW/perf/security/review/refactor):** You already have **`/code-review`, `/security-review`, `verify`** built in. **Real hits:** `webapp-testing` (official), `trailofbits` static-analysis/security suite, `property-based-testing`. Lint config → repo config, not a skill.
- **Documentation (tech writing/ADRs/arch/PRDs/API docs/diagrams):** **Real hits:** `doc-coauthoring`, `writing-guidelines`, official `docx/pdf/pptx/xlsx`. ADR/PRD house formats → custom.
- **Product (PM/UX/design systems/roadmaps/sprint):** **No serious registry skills.** All → custom house-format skills. `theme-factory` + `frontend-design` help design-system work.

---

## Phase 3 — Evaluation of every _real_ skill

Scores are 1–10 for _this product_. "Last updated / adoption" are reported only where verifiable; I do **not** invent them. Star counts are repo-level, verified at fetch time.

### Official — `anthropics/skills` (~158k★ repo; install via plugin marketplace)

| Skill                                                                        | Purpose                            | Fit here                                                       | Strengths                                    | Weaknesses                                            | Score            |
| ---------------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------- | ---------------- |
| `webapp-testing`                                                             | Drive real web apps for E2E/QA     | Testing dashboards & auth flows                                | Official, real-browser, catches runtime bugs | Overlaps built-in `verify`/Playwright                 | **8**            |
| `mcp-builder`                                                                | Scaffolds MCP servers to spec      | Your "MCP support" + "MCP Server Discovery" feature            | Official, on-spec, saves boilerplate         | Only relevant when authoring MCP servers              | **8**            |
| `docx`                                                                       | Generate/edit Word docs            | "Weekly Reports," client-facing exports                        | Official, high-fidelity                      | Source-available license — check terms for commercial | **7**            |
| `pdf`                                                                        | Generate/fill/extract PDFs         | Email reports, briefs, investor exports                        | Official                                     | Same license note                                     | **7**            |
| `pptx`                                                                       | Generate slide decks               | Investor/market decks from trend data                          | Official                                     | Niche until you ship decks                            | **6**            |
| `xlsx`                                                                       | Generate spreadsheets              | Data exports, funding tables                                   | Official                                     | Niche                                                 | **6**            |
| `skill-creator`                                                              | Scaffolds new SKILL.md skills      | **You will author many custom skills** — this is the meta-tool | Official, enforces spec                      | Meta only                                             | **9**            |
| `frontend-design`                                                            | Opinionated UI generation          | Design system / dashboard components                           | Official, strong defaults                    | Opinionated aesthetic may clash with your identity    | **7**            |
| `theme-factory`                                                              | Generate cohesive theme/token sets | Your design-tokens + dark/light requirement                    | Directly maps to spec                        | Needs taste review                                    | **7**            |
| `web-artifacts-builder`                                                      | Rich self-contained web artifacts  | Prototyping dashboards/wireframes                              | Fast prototyping                             | Artifact-scoped, not app code                         | **6**            |
| `brand-guidelines`                                                           | Apply brand consistency            | Marketing site + design system                                 | Useful for `marketing` app                   | Needs your brand defined first                        | **5**            |
| `claude-api`                                                                 | Anthropic API reference/patterns   | Your ai-service                                                | Authoritative, current                       | **Already built-in this session** — skip external     | **8** (built-in) |
| `doc-coauthoring`                                                            | Long-form doc collaboration        | Your 60+ doc deliverables                                      | Official, structured                         | General-purpose                                       | **7**            |
| `canvas-design` / `algorithmic-art` / `slack-gif-creator` / `internal-comms` | Creative/comms                     | Marginal here                                                  | Official                                     | Not core to product                                   | **3–4**          |

### Vendor — `vercel-labs/agent-skills` (`npx skills add vercel-labs/agent-skills`)

| Skill                     | Purpose                               | Fit                                     | Score                          |
| ------------------------- | ------------------------------------- | --------------------------------------- | ------------------------------ |
| `react-best-practices`    | React/Next perf, 40+ rules            | High — your entire frontend             | **9**                          |
| `web-design-guidelines`   | UI review: 100+ a11y/perf/UX rules    | High — enterprise dashboards + a11y req | **9**                          |
| `composition-patterns`    | Scalable React component architecture | High — `packages/ui` design             | **8**                          |
| `writing-guidelines`      | Prose/style review, 80+ rules         | Medium-high — your docs & blog          | **7**                          |
| `vercel-optimize`         | Audit Vercel projects                 | Conditional — only if on Vercel         | **6** (if Vercel) / 2 (if not) |
| `react-view-transitions`  | View Transition API animations        | Medium — Framer Motion alt              | **6**                          |
| `react-native-guidelines` | RN best practices                     | Low — no mobile app in v1               | **3**                          |
| `vercel-deploy-claimable` | Vercel claimable deploys              | Low — niche flow                        | **3**                          |

**Caveat:** these encode _Vercel's_ opinions. Excellent, but if you deploy on AWS/Fly/Railway, treat `vercel-optimize`/`vercel-deploy-claimable` as N/A and read the others as guidance, not law.

### Security — `trailofbits/skills` (`/plugin marketplace add trailofbits/skills`)

Gold-standard security firm. ~35 skills; the relevant subset for a web SaaS:

| Skill                                         | Purpose                                            | Fit                                           | Score |
| --------------------------------------------- | -------------------------------------------------- | --------------------------------------------- | ----- |
| `static-analysis`                             | CodeQL/Semgrep/SARIF toolkit                       | High — your OWASP/security req                | **9** |
| `insecure-defaults`                           | Detect hardcoded creds, fail-open, insecure config | High — secrets/config hygiene                 | **9** |
| `differential-review`                         | Security-focused diff review w/ git history        | High — every PR                               | **8** |
| `supply-chain-risk-auditor`                   | Audit dependency threat landscape                  | High — large monorepo dep surface             | **8** |
| `semgrep-rule-creator`                        | Author custom Semgrep rules                        | Medium — house security rules                 | **7** |
| `property-based-testing`                      | PBT guidance multi-language                        | Medium — scoring/ranking logic                | **7** |
| `agentic-actions-auditor`                     | Audit GH Actions for agent-sec issues              | Medium — your CI/CD                           | **7** |
| `gh-cli`                                      | Route GitHub fetches through authed `gh`           | Low-friction quality-of-life                  | **6** |
| `modern-python`                               | uv/ruff/pytest                                     | Low — only if any Python (e.g., ML/ingestion) | **5** |
| `mutation-testing` / `fp-check`               | Test quality / false-positive gating               | Medium — reduces review noise                 | **6** |
| smart-contract / blockchain / firmware skills | —                                                  | **N/A** for this product                      | **1** |

### Built-in this session (already available — do **not** install duplicates)

`/code-review` (**9**), `/security-review` (**8**), `verify` (**8**), `dataviz` (**9** — directly serves Recharts dashboards), `artifact-design` (**7**), `claude-api` (**8**), `update-config`, `schedule`/`loop` (**7** — useful for your scheduler/ingestion cron design).

---

## Phase 4 — Installation Recommendation

### 🟢 Essential (install immediately)

| Skill                                                           | Source                     | Why                                                     |
| --------------------------------------------------------------- | -------------------------- | ------------------------------------------------------- |
| `skill-creator`                                                 | `anthropics/skills`        | You'll author many house skills; this enforces the spec |
| `react-best-practices`                                          | `vercel-labs/agent-skills` | Entire frontend quality baseline                        |
| `web-design-guidelines`                                         | `vercel-labs/agent-skills` | Enterprise a11y/perf/UX review                          |
| `composition-patterns`                                          | `vercel-labs/agent-skills` | `packages/ui` architecture                              |
| `webapp-testing`                                                | `anthropics/skills`        | E2E on real browser, auth flows                         |
| `mcp-builder`                                                   | `anthropics/skills`        | Direct map to your MCP features                         |
| `static-analysis` + `insecure-defaults` + `differential-review` | `trailofbits/skills`       | Security req / OWASP / every PR                         |

### 🟡 Recommended (productivity)

| Skill                               | Source                     | Why                                    |
| ----------------------------------- | -------------------------- | -------------------------------------- |
| `writing-guidelines`                | `vercel-labs/agent-skills` | 60+ docs + blog quality                |
| `doc-coauthoring`                   | `anthropics/skills`        | Long-form doc workflow                 |
| `theme-factory` + `frontend-design` | `anthropics/skills`        | Design tokens, dashboards              |
| `docx` + `pdf`                      | `anthropics/skills`        | Weekly Reports / Email Reports feature |
| `supply-chain-risk-auditor`         | `trailofbits/skills`       | Monorepo dependency risk               |
| `agentic-actions-auditor`           | `trailofbits/skills`       | CI/CD hardening                        |
| `property-based-testing`            | `trailofbits/skills`       | Scoring-engine correctness             |

### 🔵 Optional (nice to have)

`xlsx`, `pptx` (exports/decks), `web-artifacts-builder` (prototyping), `brand-guidelines`, `react-view-transitions`, `vercel-optimize` _(only if on Vercel)_, `modern-python` _(only if Python appears)_, `semgrep-rule-creator`, `gh-cli`, `mutation-testing`.

### Exact install commands

```bash
# Vercel collection (installs the 8; keep react-best-practices, web-design-guidelines, composition-patterns, writing-guidelines)
npx skills add vercel-labs/agent-skills --skill react-best-practices --skill web-design-guidelines --skill composition-patterns --skill writing-guidelines -g -a claude-code -y

# Official Anthropic skills — via plugin marketplace inside Claude Code:
#   /plugin marketplace add anthropics/skills
#   /plugin install document-skills@anthropic-agent-skills     # docx/pdf/pptx/xlsx
#   /plugin install example-skills@anthropic-agent-skills      # webapp-testing, mcp-builder, skill-creator, frontend-design, theme-factory, doc-coauthoring...
# Or per-skill via the CLI:
npx skills add anthropics/skills --skill skill-creator --skill webapp-testing --skill mcp-builder --skill theme-factory --skill frontend-design --skill doc-coauthoring -g -a claude-code -y

# Trail of Bits security suite — via plugin marketplace:
#   /plugin marketplace add trailofbits/skills
# Or per-skill:
npx skills add trailofbits/skills --skill static-analysis --skill insecure-defaults --skill differential-review --skill supply-chain-risk-auditor --skill agentic-actions-auditor --skill property-based-testing -g -a claude-code -y
```

> **Note on your example syntax:** the brief's `npx skills add <skill> -g -y` is close but incomplete — the real CLI needs a **GitHub source** (`owner/repo`) and (optionally) `--skill <name>`. The verified form is `npx skills add owner/repo --skill name -g -a claude-code -y`. Official Anthropic skills are cleanest to install through Claude Code's `/plugin marketplace add anthropics/skills`.

---

## Phase 5 — Gap Analysis & Custom Skills to Author

These are the capabilities the registry does **not** cover well. Author them yourself with `skill-creator`. Each is a house-standard workflow — exactly what skills are _for_. Ordered by leverage.

### 5.1 `data-source-integration` ⭐ highest leverage

- **Why:** Your product is fundamentally an ingestion engine over Reddit/GitHub/HN/PH/YouTube/X/ArXiv/HF/funding DBs. Each has different auth, rate limits, ToS, and legal/scraping constraints. No skill encodes this; getting it wrong is legal + reliability risk.
- **Inputs:** source name, endpoint/API vs scrape, desired fields, refresh cadence.
- **Outputs:** a typed connector in `services/ingestion-service` (Zod schema, BullMQ job, rate-limit config, retry/backoff, ToS-compliance note, caching layer).
- **Workflow:** classify legality (official API / gray-area / prohibited) → pick auth → generate connector + tests + fixtures (MSW) → register schedule.
- **Quality checklist:** ✅ respects documented rate limit ✅ ToS/robots reviewed ✅ PII handling ✅ idempotent ✅ backoff ✅ typed + validated ✅ MSW-mocked test.

### 5.2 `opportunity-scoring-engine` ⭐

- **Why:** The 20+ AI scores (Opportunity/Business/Developer/Creator/SEO/Competition/Monetization/Risk/Difficulty/Predicted-Lifetime…) must be **consistent, explainable, and evaluable**. Base Claude will drift prompt-to-prompt. This is your core IP.
- **Inputs:** trend record, score dimension, rubric.
- **Outputs:** structured JSON score + rationale + confidence, conforming to a versioned rubric; a golden-set eval case.
- **Quality checklist:** ✅ deterministic schema ✅ rubric-anchored ✅ rationale cited ✅ eval-set regression ✅ Langfuse trace tagged.

### 5.3 `llm-eval-harness` (RAG + prompt eval)

- **Why:** You list Langfuse/OTel, RAG, semantic search. No registry skill gives you an eval harness. Needed to prevent silent AI-quality regressions.
- **Inputs:** prompt/chain, golden dataset, metrics (faithfulness, relevance, cost, latency).
- **Outputs:** eval run report, pass/fail gate for CI, regression diff.
- **Quality checklist:** ✅ golden set versioned ✅ cost/latency tracked ✅ CI gate ✅ provider-agnostic (OpenAI/Anthropic/Gemini via LiteLLM).

### 5.4 `prisma-migration-auditor`

- **Why:** Multi-tenant Postgres. Migrations risk table locks and data loss. Trail of Bits has no Prisma-specific skill.
- **Outputs:** migration review (locking, backfill safety, tenant-isolation, rollback plan).
- **Checklist:** ✅ no long lock on hot tables ✅ backfill batched ✅ reversible ✅ RLS/tenant scoping intact.

### 5.5 `api-contract` (REST/tRPC + OpenAPI)

- **Why:** Enforce your house API standard — error envelope, pagination, versioning, RBAC annotations, OpenAPI generation, audit-log hooks.
- **Checklist:** ✅ Zod-validated ✅ RBAC declared ✅ rate-limited ✅ OpenAPI emitted ✅ audit-logged ✅ idempotency keys on writes.

### 5.6 `adr-and-prd-templates`

- **Why:** Your process mandates ADRs + PRD + user stories in a _house format_ at each phase. `doc-coauthoring`/`writing-guidelines` help prose but don't enforce your templates.
- **Outputs:** ADR (context/decision/consequences/status), PRD (problem/personas/scope/metrics), user stories (INVEST).

### 5.7 `dashboard-spec` (design)

- **Why:** 10 dashboards each needing KPIs/filters/charts/drill-downs/exports/responsive spec. Pairs with built-in `dataviz` + `theme-factory`.
- **Outputs:** dashboard spec doc + Recharts/TanStack-Table component scaffold to house tokens.

### 5.8 `iac-standards` (Docker/Compose/GH Actions/Terraform)

- **Why:** No trustworthy registry IaC skill. Encode your base images, multi-stage builds, non-root, pinned actions, OIDC-to-AWS, environment promotion.
- **Checklist:** ✅ pinned digests ✅ non-root ✅ SBOM ✅ secrets via OIDC not static ✅ least-privilege IAM.

> Author 5.1, 5.2, 5.3 **first** — they are the product's differentiators and the areas the registry cannot help.

---

## Phase 6 — Installation Script

Saved alongside this report as [`install-skills.sh`](./install-skills.sh). It installs all **Essential + Recommended** skills, is idempotent, and is CI-safe (`-y`).

---

## Phase 7 — Skills Matrix

| Capability                          | Existing Skill (verified)                           | Install                                   | Custom Needed                        | Priority               |
| ----------------------------------- | --------------------------------------------------- | ----------------------------------------- | ------------------------------------ | ---------------------- |
| React/Next quality                  | `react-best-practices`                              | `npx skills add vercel-labs/agent-skills` | No                                   | Essential              |
| UI a11y/perf/UX review              | `web-design-guidelines`                             | ↑                                         | No                                   | Essential              |
| Component architecture              | `composition-patterns`                              | ↑                                         | No                                   | Essential              |
| Design tokens/theme                 | `theme-factory`, `frontend-design`                  | plugin/CLI                                | Partial (`dashboard-spec`)           | Recommended            |
| Data viz                            | **built-in `dataviz`**                              | —                                         | No                                   | Essential (have it)    |
| E2E/QA                              | `webapp-testing` + built-in `verify`                | plugin/CLI                                | Partial (test-gen to house patterns) | Essential              |
| MCP servers                         | `mcp-builder`                                       | plugin/CLI                                | No                                   | Essential              |
| Anthropic API                       | **built-in `claude-api`**                           | —                                         | No                                   | Essential (have it)    |
| Security static analysis            | `static-analysis`                                   | `trailofbits/skills`                      | No                                   | Essential              |
| Insecure config/secrets             | `insecure-defaults`                                 | ↑                                         | No                                   | Essential              |
| PR security diff                    | `differential-review` + built-in `/security-review` | ↑                                         | No                                   | Essential              |
| Supply-chain risk                   | `supply-chain-risk-auditor`                         | ↑                                         | No                                   | Recommended            |
| Code review                         | **built-in `/code-review`**                         | —                                         | No                                   | Essential (have it)    |
| CI/CD hardening                     | `agentic-actions-auditor`                           | `trailofbits/skills`                      | Partial (`iac-standards`)            | Recommended            |
| Property-based testing              | `property-based-testing`                            | ↑                                         | No                                   | Recommended            |
| Docs prose/style                    | `writing-guidelines`, `doc-coauthoring`             | CLI/plugin                                | Yes (`adr-and-prd-templates`)        | Recommended            |
| Report exports (docx/pdf/xlsx/pptx) | `docx`/`pdf`/`xlsx`/`pptx`                          | plugin                                    | No                                   | Recommended/Optional   |
| Skill authoring                     | `skill-creator`                                     | plugin/CLI                                | No                                   | Essential              |
| **Data-source ingestion**           | ❌ none                                             | —                                         | **Yes** `data-source-integration`    | Essential (custom)     |
| **Opportunity scoring**             | ❌ none                                             | —                                         | **Yes** `opportunity-scoring-engine` | Essential (custom)     |
| **LLM/RAG eval**                    | ❌ none                                             | —                                         | **Yes** `llm-eval-harness`           | Essential (custom)     |
| **Prisma migrations**               | ❌ none                                             | —                                         | **Yes** `prisma-migration-auditor`   | Recommended (custom)   |
| **API contracts/RBAC**              | ❌ none                                             | —                                         | **Yes** `api-contract`               | Recommended (custom)   |
| Fastify/NestJS/Node backend         | ❌ none (base Claude)                               | —                                         | No (config, not skill)               | N/A                    |
| Prisma/PG/Redis/BullMQ              | ❌ none (base Claude)                               | —                                         | No                                   | N/A                    |
| Terraform/AWS/K8s                   | ❌ none of quality                                  | —                                         | Partial (`iac-standards`)            | Optional               |
| Vercel deploy audit                 | `vercel-optimize`                                   | CLI                                       | No                                   | Optional (Vercel only) |

---

## Phase 8 — Integration Plan (skill × lifecycle stage)

| Stage                 | Skills to invoke                                                                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Product Discovery** | `doc-coauthoring`, `writing-guidelines`; custom `adr-and-prd-templates`                                                                            |
| **Market Research**   | Base Claude + `WebSearch`; custom `data-source-integration` (define feasibility of each source early)                                              |
| **PRD Creation**      | custom `adr-and-prd-templates`, `writing-guidelines`, `doc-coauthoring`                                                                            |
| **Architecture**      | `/code-review`(design), built-in `claude-api` for AI arch, `skill-creator` to codify decisions; custom `api-contract`                              |
| **Frontend Dev**      | `react-best-practices`, `composition-patterns`, `web-design-guidelines`, `frontend-design`, `theme-factory`, built-in `dataviz`, `artifact-design` |
| **Backend Dev**       | Base Claude + custom `api-contract`; `insecure-defaults` on config; `differential-review` on PRs                                                   |
| **AI Dev**            | `mcp-builder`, `claude-api`; custom `opportunity-scoring-engine` + `llm-eval-harness` (gate every prompt change)                                   |
| **Database Design**   | Base Claude for schema; custom `prisma-migration-auditor` on every migration                                                                       |
| **DevOps**            | `agentic-actions-auditor`, `gh-cli`; custom `iac-standards`; `vercel-optimize` if applicable                                                       |
| **Testing**           | `webapp-testing`, built-in `verify`, `property-based-testing`, `mutation-testing`                                                                  |
| **Documentation**     | `writing-guidelines`, `doc-coauthoring`, `docx`/`pdf` for exports                                                                                  |
| **Deployment**        | `agentic-actions-auditor`, `differential-review` (release diff), built-in `/security-review`                                                       |
| **Maintenance**       | `supply-chain-risk-auditor` (scheduled), `static-analysis`, `differential-review`; use built-in `schedule`/`loop` for recurring audits             |

**Rollout order (2-week adoption):**

1. **Day 1:** Install Essential set + `skill-creator`. Wire `/code-review` + `/security-review` + `differential-review` into your PR template.
2. **Days 2–4:** Author `data-source-integration`, `opportunity-scoring-engine`, `llm-eval-harness` (product-critical, registry can't help).
3. **Week 2:** Add Recommended set; author `api-contract`, `prisma-migration-auditor`, `adr-and-prd-templates`, `iac-standards`.
4. **Ongoing:** Schedule `supply-chain-risk-auditor` + `static-analysis` weekly; run `llm-eval-harness` in CI on every AI change.

---

## Verification & Honesty Notes

- Every skill named here was verified against a live GitHub repo/marketplace on 2026-07-03 (fetched: `anthropics/skills`, `vercel-labs/agent-skills`, `trailofbits/skills`, `vercel-labs/skills`).
- I did **not** invent authors, URLs, star counts, or "last updated" dates. Where the ecosystem lacks a skill, I said so plainly and moved the capability to Phase 5 (custom) rather than fabricate a package.
- Community aggregator sites (agentskills.io, skillsmp.com, claudedirectory.org, lobehub) list many third-party skills of **unverified quality** — treat them as leads to vet, not endorsements. I deliberately did not recommend unaudited third-party framework "skills."
- Built-in session skills (`/code-review`, `/security-review`, `verify`, `dataviz`, `artifact-design`, `claude-api`) are already available — installing external equivalents would duplicate functionality, which your constraints prohibit.

### Sources

- [anthropics/skills](https://github.com/anthropics/skills)
- [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)
- [vercel-labs/skills (`npx skills` CLI)](https://github.com/vercel-labs/skills)
- [trailofbits/skills](https://github.com/trailofbits/skills)
- [Agent Skills — Claude Code Docs](https://code.claude.com/docs/en/skills)
- [Anthropic — Equipping agents with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
