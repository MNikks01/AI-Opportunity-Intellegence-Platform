#!/usr/bin/env bash
# Generates the .claude/ workspace + .agents/ charters with tailored, consistent content.
# Idempotent: re-running overwrites the generated files.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

STD='Standards enforced: strict TS + Zod validation · RBAC + audit on mutations · all LLM calls via `@aioi/ai-sdk` · Conventional Commits · tests + CHANGELOG + changeset · CI green. See [.claude/STACK.md](../STACK.md) and [docs/08-quality/CODE_GUIDELINES.md](../../docs/08-quality/CODE_GUIDELINES.md).'

# ─────────────────────────── commands ───────────────────────────
cmd() { # slug | title | purpose | steps
  cat > ".claude/commands/$1.md" <<EOF
# /$1 — $2

**Purpose:** $3

## When to use
$4

## What it does
1. Confirms scope and the affected workspaces (\`@aioi/*\`).
2. Applies the relevant skill(s) and workflow for this task type.
3. Makes surgical changes; keeps diffs small and reviewable.
4. Runs the gate: \`pnpm typecheck && pnpm test\` (and \`pnpm lint\`/\`build\` where relevant).
5. Updates docs / CHANGELOG / changeset as needed.

## $STD

## Output
A focused change on a \`feat|fix|chore/*\` branch with a PR into \`development\`, green CI, and an
updated backlog/roadmap entry where applicable.
EOF
}
cmd build   "Build" "Build all workspaces with Turborepo and verify the graph compiles." "Before a PR, after dependency changes, or to reproduce CI build locally."
cmd feature "New Feature" "Implement a new feature end-to-end following the new-feature workflow." "Starting a backlog item (B-0xx). Begins with a short plan, not code."
cmd bug     "Bug Fix" "Reproduce, fix, and regression-test a defect." "A confirmed bug with a repro. Write a failing test first."
cmd docs    "Docs" "Generate or update documentation to house standards (writing-guidelines)." "Behavior or a decision changed, or a doc is missing/stale."
cmd review  "Code Review" "Review the working diff for correctness + simplification (use /code-review)." "Before requesting review on any non-trivial change."
cmd release "Release" "Cut a release via Changesets and the development→main promotion flow." "Promoting accumulated changes on development to a tagged main release."
cmd test    "Test" "Generate and run tests to the coverage gate (Vitest/Playwright/MSW)." "New code paths, connectors (happy/429/malformed/empty), or UI components (a11y)."
cmd refactor "Refactor" "Restructure code with zero behavior change; keep tests green." "Reducing complexity/duplication without altering observable behavior."
cmd optimize "Optimize" "Improve performance against the PRD budgets (TTFB<500ms p75, API p95<300ms)." "A measured regression or a hot path (dashboards, scoring, ingestion)."
cmd migration "DB Migration" "Author and audit a Prisma migration (locking + tenant-isolation safe)." "Any schema change. Runs the migration-auditor checks; backfills batched."
cmd deploy  "Deploy" "Deploy a service/app to an environment with gates and rollback." "Promoting to staging/production per DEPLOYMENT_GUIDE; never bypass CI."

# ─────────────────────────── skills ───────────────────────────
skill() { # dir | name | purpose | inputs | outputs | best | fail | check
  cat > ".claude/skills/$1/SKILL.md" <<EOF
---
name: $2
description: Project knowledge + conventions for $3 in the AI Opportunity Intelligence Platform. Use when working on $1 tasks in this repo.
---

# $2

**Purpose:** $3

## Inputs
$4

## Outputs
$5

## Examples
- See the canonical usage in the relevant \`@aioi/*\` package and the linked docs below.

## Best practices
$6

## Failure modes
$7

## Quality checklist
$8

## References
[STACK](../../STACK.md) · [ARCHITECTURE](../../ARCHITECTURE.md) · [CODE_GUIDELINES](../../../docs/08-quality/CODE_GUIDELINES.md)
EOF
}
skill frontend frontend "React 19 + Next.js App Router UI" \
  "Design (docs/03-design), \`@aioi/ui\` tokens/components, data from tRPC/RSC." \
  "Accessible, responsive components; RSC-first; loading/empty/error states." \
  "- RSC by default; \`\"use client\"\` only when needed.\n- Consume \`@aioi/ui\` tokens, never raw values.\n- React Query for server state, Zustand for UI state." \
  "- Client components leaking secrets/DB access.\n- Missing empty/error/loading states.\n- Color-only meaning (fails a11y)." \
  "- [ ] WCAG 2.2 AA\n- [ ] loading/empty/error states\n- [ ] no \`any\`; props typed\n- [ ] matches design tokens"
skill backend backend "Fastify services with tRPC (internal) + REST (public)" \
  "API design (docs/05-api), \`@aioi/database\` repos, \`@aioi/validation\` schemas." \
  "Thin transport + a single service layer; RBAC + audit; OpenAPI for REST." \
  "- Business logic in service layer; transport is thin.\n- Validate all input with Zod at the boundary.\n- Idempotency keys on writes." \
  "- Unvalidated input reaching handlers.\n- Missing RBAC/tenant guard.\n- Duplicated logic across tRPC/REST." \
  "- [ ] RBAC + audit\n- [ ] Zod-validated\n- [ ] rate-limited\n- [ ] OpenAPI updated"
skill ai ai "LLM integration via the ai-sdk gateway" \
  "\`@aioi/ai-sdk\` (LiteLLM), rubric/prompt versions, cost caps." \
  "Provider-agnostic calls; structured output; Langfuse traces; cost tags." \
  "- Only call models through \`@aioi/ai-sdk\`.\n- Structured output validated with Zod.\n- Cache results; draft cheap, finalize strong." \
  "- Direct provider SDK calls.\n- Unbounded cost.\n- Prompt change without eval." \
  "- [ ] via ai-sdk\n- [ ] eval-harness green\n- [ ] cost/latency traced\n- [ ] schema-valid output"
skill rag rag "Retrieval-augmented search over pgvector" \
  "Embeddings, pgvector index, query, reranker, golden set." \
  "Grounded answers with cited context; faithfulness-gated." \
  "- Embed → kNN (pgvector) → rerank → answer with citations.\n- Gate faithfulness via llm-eval-harness.\n- Chunk sensibly; store provenance." \
  "- Hallucinated (ungrounded) answers.\n- Stale index.\n- Poor recall from bad chunking." \
  "- [ ] citations resolve\n- [ ] faithfulness threshold met\n- [ ] index fresh\n- [ ] eval case added"
skill agents agents "Building MCP servers + agent tools" \
  "MCP spec, \`mcp-builder\` skill, tool schemas." \
  "Spec-compliant MCP server/tools with typed inputs." \
  "- Scaffold with mcp-builder.\n- Type + validate tool inputs.\n- Least-privilege tool actions." \
  "- Over-broad tool permissions.\n- Unvalidated tool args.\n- Non-idempotent side effects." \
  "- [ ] spec-compliant\n- [ ] inputs validated\n- [ ] least privilege\n- [ ] documented"
skill prompt-engineering prompt-engineering "Versioned prompts + evaluation" \
  "Prompt text, rubric version, golden dataset." \
  "Versioned prompts with an eval case; provider-agnostic." \
  "- Version every prompt; never edit silently.\n- Add a golden case per change.\n- Keep provider-agnostic." \
  "- Drift across runs.\n- No eval gate.\n- Overfitting to one model." \
  "- [ ] versioned\n- [ ] eval case added\n- [ ] 2+ providers\n- [ ] cost tracked"
skill database database "Prisma schema, queries, and indexing (Postgres + pgvector)" \
  "\`@aioi/database\` schema, DB design (docs/04-data), query patterns." \
  "Typed queries via repos; safe migrations; correct indexes." \
  "- Access DB only via \`@aioi/database\`.\n- Index hot queries; use FTS + pgvector.\n- Migrations reviewed for lock safety." \
  "- N+1 queries.\n- Missing tenant scoping/RLS.\n- Unsafe migrations (locks/data loss)." \
  "- [ ] indexed hot paths\n- [ ] tenant-scoped\n- [ ] migration audited\n- [ ] no N+1"
skill auth auth "Clerk adapter + RBAC + multi-tenancy" \
  "\`@aioi/auth\`, roles (Owner/Admin/Member/Billing/Viewer), org context." \
  "Auth behind an adapter; RBAC checks; tenant guard + RLS." \
  "- All auth via \`@aioi/auth\` (swappable).\n- Deny by default; check RBAC before handlers.\n- Set RLS org context per request." \
  "- Trusting client-supplied org ids.\n- Missing permission checks.\n- Leaking cross-tenant data." \
  "- [ ] RBAC enforced\n- [ ] tenant guard + RLS\n- [ ] audit logged\n- [ ] adapter-isolated"
skill payments payments "Stripe billing + metered usage" \
  "Stripe products/prices, entitlements, webhooks." \
  "Subscriptions + metered API billing; verified webhooks." \
  "- Verify webhook signatures.\n- Reconcile entitlements from Stripe as source of truth.\n- Meter API usage per key." \
  "- Trusting client for entitlements.\n- Unverified webhooks.\n- Double-charging on retries." \
  "- [ ] webhooks verified\n- [ ] idempotent\n- [ ] entitlements reconciled\n- [ ] metering accurate"
skill caching caching "Redis read-model caching" \
  "Redis, read models, TTLs, invalidation events." \
  "Fast dashboards via cached read models with correct invalidation." \
  "- Cache read models, not raw rows.\n- Invalidate on \`trend.updated\`.\n- Stale-while-revalidate on the client." \
  "- Stale data after updates.\n- Cache stampede.\n- Caching tenant data without scoping the key." \
  "- [ ] keyed by tenant\n- [ ] invalidation wired\n- [ ] TTL set\n- [ ] no stampede"
skill queues queues "BullMQ jobs + Redis Streams events" \
  "BullMQ queues, job payloads, consumer groups." \
  "Idempotent, retryable jobs; poison-message handling." \
  "- Idempotent handlers + dedupe keys.\n- Backoff + jitter on retries.\n- Quarantine poison messages, alert." \
  "- At-least-once causing dupes.\n- Crash-looping workers.\n- Unbounded retries." \
  "- [ ] idempotent\n- [ ] backoff+jitter\n- [ ] poison handling\n- [ ] metrics (depth/lag)"
skill devops devops "CI/CD pipelines + IaC" \
  ".github/workflows, Terraform, environments." \
  "Green pipelines; reproducible infra; least-privilege." \
  "- Pin action + image digests.\n- OIDC to cloud, no static keys.\n- Gate deploys on CI + migrations." \
  "- Unpinned actions.\n- Static cloud creds.\n- Deploys bypassing gates." \
  "- [ ] pinned\n- [ ] OIDC\n- [ ] gated deploy\n- [ ] rollback path"
skill docker docker "Multi-stage container images" \
  "Dockerfiles, base images, Turbo prune." \
  "Small, non-root, reproducible images with healthchecks." \
  "- Multi-stage + distroless/slim.\n- Non-root user; pinned digests.\n- SBOM in CI." \
  "- Root containers.\n- Fat images.\n- Unpinned bases." \
  "- [ ] non-root\n- [ ] pinned\n- [ ] healthcheck\n- [ ] SBOM"
skill kubernetes kubernetes "K8s manifests for the AWS/EKS scale path" \
  "Deployments, HPA, network policies (infra/kubernetes)." \
  "Scalable, isolated workloads with autoscaling." \
  "- Set requests/limits + HPA.\n- Network policies (deny by default).\n- Readiness/liveness probes." \
  "- No resource limits.\n- Open network policy.\n- Missing probes." \
  "- [ ] limits+HPA\n- [ ] netpol\n- [ ] probes\n- [ ] PodSecurity"
skill testing testing "Vitest, Playwright, MSW, coverage" \
  "Test frameworks, fixtures, golden sets." \
  "Behavior tests + E2E + network mocks to coverage gates." \
  "- Test behavior, not implementation.\n- Connectors: happy/429/malformed/empty.\n- Deterministic; no real network in unit tests." \
  "- Snapshot-only tests.\n- Flaky/networked unit tests.\n- Coverage regressions." \
  "- [ ] behavior-focused\n- [ ] a11y for UI\n- [ ] deterministic\n- [ ] coverage held"
skill security security "OWASP ASVS L2 controls" \
  "Threat model, RBAC, secrets, headers." \
  "Hardened endpoints; encrypted secrets; audited actions." \
  "- Parameterized queries; encode output.\n- Verify webhooks; rate-limit.\n- Secrets via manager; scan in CI." \
  "- SQLi/XSS via unvalidated input.\n- Secrets in code/logs.\n- Missing rate limits." \
  "- [ ] input validated\n- [ ] secrets safe\n- [ ] rate-limited\n- [ ] audit logged"
skill accessibility accessibility "WCAG 2.2 AA compliance" \
  "Design system a11y rules, ARIA, keyboard." \
  "Keyboard-navigable, screen-reader-friendly UI." \
  "- Visible focus; logical tab order.\n- ARIA + data-table fallback for charts.\n- Respect prefers-reduced-motion." \
  "- Color-only meaning.\n- Keyboard traps.\n- Missing labels." \
  "- [ ] contrast ≥4.5:1\n- [ ] keyboard nav\n- [ ] ARIA\n- [ ] reduced-motion"
skill analytics analytics "Product analytics + telemetry events" \
  "\`@aioi/analytics\` event schema, north-star metric." \
  "Typed events feeding activation/retention + north-star." \
  "- Define events with a typed schema.\n- Track the north-star (acted-on opportunities).\n- No PII in event props." \
  "- Ad-hoc untyped events.\n- PII leakage.\n- Vanity metrics." \
  "- [ ] typed schema\n- [ ] no PII\n- [ ] north-star wired\n- [ ] documented"
skill performance performance "Performance budgets + Core Web Vitals" \
  "PRD NFRs, caching, profiling." \
  "Pages/APIs within budget; cost per active user tracked." \
  "- Cache read models; SSR/ISR for SEO.\n- Budget: TTFB<500ms p75, API p95<300ms.\n- Track LLM cost/active user." \
  "- Unbounded LLM cost.\n- Slow dashboards (no cache).\n- Large bundles." \
  "- [ ] within budget\n- [ ] cached\n- [ ] bundle analyzed\n- [ ] cost tracked"
skill seo seo "SSR/ISR + metadata for organic acquisition" \
  "marketing/docs apps, topic/trend teaser pages." \
  "Indexable, fast public pages (dogfooded keywords)." \
  "- SSR/ISR public pages; clean URLs.\n- Metadata + structured data.\n- Dogfood 'suggested keywords'." \
  "- Client-only content (unindexable).\n- Duplicate/thin pages.\n- Missing metadata." \
  "- [ ] SSR/ISR\n- [ ] metadata\n- [ ] canonical URLs\n- [ ] sitemap"
skill documentation documentation "Technical writing to house standards" \
  "writing-guidelines, doc templates." \
  "Clear, current docs + ADRs; CHANGELOG maintained." \
  "- Follow writing-guidelines.\n- Record decisions as ADRs.\n- Update CHANGELOG [Unreleased]." \
  "- Stale docs.\n- Decisions buried in code.\n- Duplicated content." \
  "- [ ] accurate\n- [ ] ADR where needed\n- [ ] CHANGELOG updated\n- [ ] linked"
skill ui-ux ui-ux "Design system, tokens, and dashboards" \
  "Design system (docs/03-design), theme-factory, dataviz." \
  "On-brand, token-driven, accessible dashboards." \
  "- Semantic tokens (light/dark); no raw values.\n- Chart colors via dataviz, not hardcoded.\n- Motion with meaning." \
  "- Inconsistent spacing/type.\n- Hardcoded colors.\n- Decorative motion." \
  "- [ ] tokens only\n- [ ] both themes\n- [ ] a11y\n- [ ] dataviz colors"

# ─────────────────────────── .claude/agents (subagents) ───────────────────────────
agent() { # slug | name | when | tools
  cat > ".claude/agents/$1.md" <<EOF
---
name: $2
description: $3
tools: $4
---

You are the **$2** for the AI Opportunity Intelligence Platform. Operate within the conventions in
[.claude/STACK.md](../STACK.md), [.claude/ARCHITECTURE.md](../ARCHITECTURE.md), and
[docs/08-quality/CODE_GUIDELINES.md](../../docs/08-quality/CODE_GUIDELINES.md). A full role charter is
in [.agents/$1.md](../../.agents/$1.md).

## Operating rules
- Think before coding; make surgical, reviewable changes.
- Enforce: strict TS + Zod, RBAC + audit on mutations, LLM only via \`@aioi/ai-sdk\`, DB only via
  \`@aioi/database\`, Conventional Commits, tests + CHANGELOG + changeset, green CI.
- Work on a \`feat|fix|chore/*\` branch → PR into \`development\`. Never push to \`main\` directly.
- Escalate (stop and ask) on: ambiguous scope, security/privacy risk, schema/data-loss risk,
  cross-cutting architecture changes, or anything requiring a new ADR.
EOF
}
agent architect "Principal Architect" "System design, ADRs, cross-cutting technical decisions, and design reviews." "Read, Grep, Glob, Bash, WebFetch"
agent backend-engineer "Backend Engineer" "Fastify/tRPC/REST services, business logic, and data access via @aioi/database." "Read, Edit, Write, Bash, Grep, Glob"
agent frontend-engineer "Frontend Engineer" "Next.js/React UI with @aioi/ui, RSC-first, accessible and responsive." "Read, Edit, Write, Bash, Grep, Glob"
agent mobile-engineer "Mobile Engineer" "Mobile/responsive concerns and any future React Native surface (deferred in v1)." "Read, Edit, Write, Bash, Grep, Glob"
agent database-engineer "Database Engineer" "Prisma schema, migrations (lock/tenant safe), indexing, and query performance." "Read, Edit, Write, Bash, Grep, Glob"
agent ai-engineer "AI/LLM Engineer" "Scoring, RAG, and action-plan generation via @aioi/ai-sdk; eval-gated." "Read, Edit, Write, Bash, Grep, Glob"
agent devops-engineer "DevOps Engineer" "CI/CD, Docker, Terraform, environments, and releases." "Read, Edit, Write, Bash, Grep, Glob"
agent qa-engineer "QA Engineer" "Vitest/Playwright/MSW test suites, coverage gates, and a11y tests." "Read, Edit, Write, Bash, Grep, Glob"
agent security-engineer "Security Engineer" "OWASP ASVS L2, threat modeling, RBAC, secrets, and security review." "Read, Grep, Glob, Bash"
agent performance-engineer "Performance Engineer" "Budgets, caching, profiling, and LLM cost control." "Read, Edit, Bash, Grep, Glob"
agent reviewer "Code Reviewer" "Review diffs for correctness + simplification before merge." "Read, Grep, Glob, Bash"
agent debugger "Debugger" "Reproduce, isolate, and fix defects with a failing test first." "Read, Edit, Bash, Grep, Glob"
agent researcher "Researcher" "Investigate data sources, libraries, and approaches; produce recommendations." "Read, WebFetch, WebSearch, Grep, Glob"
agent ui-designer "UI Designer" "Visual design, tokens, and high-fidelity component specs." "Read, Edit, Write, Grep, Glob"
agent ux-designer "UX Designer" "Flows, wireframes, information architecture, and usability." "Read, Edit, Write, Grep, Glob"
agent technical-writer "Technical Writer" "Docs, ADRs, API docs, and CHANGELOG to house standards." "Read, Edit, Write, Grep, Glob"
agent product-manager "Product Manager" "PRD, user stories, prioritization, and backlog grooming." "Read, Edit, Write, Grep, Glob"
agent scrum-master "Scrum Master" "Sprint planning, ceremonies, and delivery flow." "Read, Edit, Write, Grep, Glob"
agent release-manager "Release Manager" "Changesets, versioning, promotion (development→main), and release notes." "Read, Edit, Bash, Grep, Glob"

# ─────────────────────────── .agents (role charters) ───────────────────────────
charter() { # slug | role | responsibilities | forbidden
  cat > ".agents/$1.md" <<EOF
# $2

**Role:** $3

## Responsibilities
- Own the outcomes for this role across the delivery lifecycle.
- Collaborate via PRs into \`development\`; keep changes small and reviewable.

## Tools
Repo tools (Read/Edit/Write/Bash/Grep/Glob), the relevant \`.claude/skills/*\`, and the matching
\`.claude/agents/$1.md\` subagent. Product context: \`.claude/PROJECT.md\`, \`docs/\`.

## Allowed actions
- Implement/change code and docs within this role's scope on a topic branch.
- Run the local gate (typecheck/lint/test/build) and open PRs into \`development\`.

## Forbidden actions
- $4
- Pushing to \`main\` directly; bypassing CI, RBAC, audit, or the eval gate; committing secrets.

## Inputs
Backlog item (B-0xx) + acceptance criteria, relevant docs, and design/system specs.

## Outputs
A merged-ready PR: passing CI, updated docs/CHANGELOG/changeset, and a backlog/roadmap update.

## Quality standards
Strict TS + Zod · RBAC + audit on mutations · tests to coverage gate · WCAG 2.2 AA (UI) ·
OWASP ASVS L2 (security) · performance budgets · Conventional Commits.

## Escalation rules
Stop and ask on: ambiguous scope, security/privacy or data-loss risk, cross-cutting architecture
changes, or anything needing a new ADR. Route architecture calls to the Architect, security to the
Security Engineer, and release decisions to the Release Manager.
EOF
}
charter architect "Principal Architect" "System design, ADRs, and cross-cutting technical decisions." "Introducing architecture changes without an ADR."
charter product-manager "Principal Product Manager" "Product vision, PRD, user stories, prioritization, backlog." "Committing to scope without acceptance criteria."
charter backend-engineer "Staff Backend Engineer" "Services, business logic, and data access." "Putting business logic in the transport layer or bypassing @aioi/database."
charter frontend-engineer "Staff Frontend Engineer" "Web UI, components, and client data flow." "Accessing the DB/secrets from client components."
charter mobile-engineer "Mobile Engineer" "Mobile/responsive surfaces (RN deferred in v1)." "Shipping native mobile scope not in the roadmap."
charter database-engineer "Database Architect" "Schema, migrations, indexing, and query performance." "Unsafe migrations (table locks / data loss) without an audit."
charter security-engineer "Security Engineer" "Threat modeling, RBAC, secrets, and security review." "Approving changes that weaken security controls."
charter devops-engineer "DevOps Engineer" "CI/CD, containers, IaC, and environments." "Static cloud credentials or unpinned actions/images."
charter performance-engineer "Performance Engineer" "Budgets, caching, and profiling." "Merging measured performance regressions."
charter qa-engineer "QA Automation Lead" "Test strategy, suites, and coverage gates." "Reducing coverage or shipping untested code paths."
charter reviewer "Code Reviewer" "Correctness + simplification review before merge." "Approving PRs with failing CI or unaddressed findings."
charter debugger "Debugger" "Reproduce, isolate, and fix defects." "Fixing symptoms without a regression test."
charter technical-writer "Technical Writer" "Docs, ADRs, API docs, and CHANGELOG." "Letting docs drift from behavior."
charter researcher "Researcher / Trend Researcher" "Investigate sources, libraries, and approaches." "Recommending ToS-violating data sources."
charter ai-engineer "AI/LLM Engineer" "Scoring, RAG, and action-plan generation." "Prompt/model changes without a green eval-harness run."
charter prompt-engineer "Prompt Engineer" "Versioned prompts and evaluation." "Editing rubric/prompts without a version bump + eval case."
charter rag-engineer "RAG Engineer" "Retrieval, embeddings, and faithfulness." "Shipping ungrounded answers or a stale index."
charter ml-engineer "ML Engineer" "Any bespoke modeling / clustering work." "Introducing models without evaluation + monitoring."
charter ux-designer "UX Designer" "Flows, wireframes, and information architecture." "Designing dead-end flows or ignoring empty/error states."
charter ui-designer "UI Designer" "Visual design, tokens, and component specs." "Hardcoding colors or breaking the token system."
charter growth-engineer "Growth Engineer" "Activation, referral/affiliate, and experiments." "Dark patterns or PII misuse in experiments."
charter seo-expert "SEO Specialist" "SSR/ISR, metadata, and organic acquisition." "Thin/duplicate pages or cloaking."
charter analytics-engineer "Analytics Engineer" "Event schema, telemetry, and the north-star metric." "Untyped events or PII in analytics."
charter release-manager "Release Manager" "Changesets, versioning, promotion, and release notes." "Releasing without a changeset or green CI."

# ─────────────────────────── workflows ───────────────────────────
wf() { # slug | title | steps(multiline)
  cat > ".claude/workflows/$1.md" <<EOF
# Workflow — $2

$3

## Definition of done
Green CI (format·lint·typecheck·test·build·security) · tests updated · docs/CHANGELOG/changeset
updated · PR into \`development\` reviewed. See [CODE_GUIDELINES §9](../../docs/08-quality/CODE_GUIDELINES.md).
EOF
}
wf new-feature "New Feature" "1. **Plan** — restate the backlog item + acceptance criteria; note affected \`@aioi/*\` packages; call out risks/ADRs.\n2. **Branch** — \`feat/<slug>\` off \`development\`.\n3. **Build** — smallest vertical slice first; apply relevant skills; strict TS + Zod; RBAC + audit.\n4. **Test** — unit + integration/E2E; a11y for UI; eval for AI.\n5. **Docs** — update docs/ADR/CHANGELOG; add a changeset.\n6. **PR** — into \`development\`; \`/code-review\`; green CI."
wf bug-fix "Bug Fix" "1. **Reproduce** — write a failing test that captures the bug.\n2. **Branch** — \`fix/<slug>\` off \`development\`.\n3. **Fix** — smallest change that makes the test pass; no unrelated refactors.\n4. **Verify** — full gate green; add a changeset if a package changed.\n5. **PR** — into \`development\` with root-cause note."
wf code-review "Code Review" "1. Run \`/code-review\` on the diff (correctness + simplification).\n2. Verify security (RBAC/validation/secrets) and tests.\n3. Confirm docs/CHANGELOG/changeset updated.\n4. Request changes or approve; require green CI before merge."
wf release "Release" "1. Accumulate changes on \`development\` (each with a changeset).\n2. Open a \`development → main\` PR (maintainer).\n3. On merge, the Release workflow opens a **Version Packages** PR.\n4. Merge it to bump versions + changelogs; tag \`vX.Y.Z\`."
wf migration "Migration" "1. Change \`packages/database/prisma/schema.prisma\`.\n2. \`pnpm --filter @aioi/database migrate:dev --name <slug>\`.\n3. Audit for lock safety + tenant isolation (migration-auditor); batch backfills.\n4. Ensure expand/contract (backward-compatible) so rollback is safe.\n5. PR into \`development\`."
wf onboarding "Onboarding" "1. Read \`.claude/PROJECT.md\`, \`STACK.md\`, \`ARCHITECTURE.md\`.\n2. \`pnpm install\`; copy \`.env.example\`; \`docker compose -f infra/docker/docker-compose.yml up -d postgres redis\`.\n3. \`pnpm --filter @aioi/database migrate:dev\`; \`pnpm dev\`.\n4. Run \`pnpm test\`; open the app; pick a \`good-first-issue\` from the backlog."
wf production-hotfix "Production Hotfix" "1. Branch \`hotfix/<slug>\` off \`main\`.\n2. Minimal fix + failing→passing test + \`patch\` changeset.\n3. PR into \`main\`; green CI; merge + tag.\n4. **Back-merge** \`main\` → \`development\` so the fix isn't lost."

# ─────────────────────────── templates ───────────────────────────
tmpl() { cat > ".claude/templates/$1.md" <<EOF
# Template — $2

$3
EOF
}
tmpl prd "PRD" "## Overview\n## Goals / Non-goals\n## Personas\n## Scope (MoSCoW × release)\n## Functional requirements (testable)\n## Non-functional requirements\n## Metrics (incl. north-star)\n## Assumptions / open questions\n## Review checklist"
tmpl trd "TRD" "## Architecture style\n## Technology decisions (with justification + rejected alt)\n## Cross-cutting (multi-tenancy, RBAC, auth, validation, audit, observability)\n## AI subsystem (eval-gated)\n## Security baseline (OWASP ASVS L2)\n## Performance & scalability\n## Risks / decisions log\n## Review checklist"
tmpl adr "ADR" "# ADR-XXXX — <title>\n- Status: Proposed | Accepted | Superseded\n- Date:\n- Deciders:\n## Context\n## Decision\n## Consequences (positive / negative)\n## Alternatives considered\n## Follow-ons"
tmpl api "API Endpoint" "## Resource & method\n## Auth + scope (RBAC)\n## Request (params/body — Zod)\n## Response (shape + status codes, RFC 9457 errors)\n## Rate limit / idempotency / pagination\n## Examples\n## Tests"
tmpl feature "Feature Spec" "## Problem / persona\n## Acceptance criteria (Given/When/Then)\n## UX flow / states (empty/loading/error)\n## Data + API changes\n## Rollout (flag?) + metrics\n## Test plan"
tmpl bug "Bug Report" "## Summary\n## Steps to reproduce\n## Expected vs actual\n## Environment (OS/Node/branch)\n## Root cause\n## Fix + regression test"
tmpl release "Release Notes" "## Version / date\n## Highlights\n## Added / Changed / Fixed\n## Migrations\n## Breaking changes\n## Upgrade notes"
tmpl meeting "Meeting Notes" "## Date / attendees\n## Agenda\n## Decisions (→ ADRs)\n## Action items (owner / due)\n## Follow-ups"
tmpl sprint "Sprint Plan" "## Sprint goal\n## Committed items (backlog ids + SP)\n## Dependencies / risks\n## Capacity\n## Exit criteria\n## Retro notes"
tmpl changelog "Changelog Entry" "### Added / Changed / Fixed / Deprecated / Removed / Security\n- <scope>: <what changed> (why, if not obvious)"
tmpl architecture "Architecture Doc" "## Context / goals\n## HLD (component diagram)\n## LLD (key sequences)\n## Data model\n## Failure modes\n## Scalability / cost\n## Review checklist"
tmpl test-plan "Test Plan" "## Scope\n## Unit / integration / E2E cases\n## Edge cases (happy/429/malformed/empty)\n## a11y / performance / security checks\n## Coverage target\n## Sign-off"

# ─────────────────────────── checklists ───────────────────────────
chk() { cat > ".claude/checklists/$1.md" <<EOF
# Checklist — $2

$3
EOF
}
chk feature "Feature" "- [ ] Acceptance criteria met; behind a flag if risky\n- [ ] Strict TS; input Zod-validated; RBAC + audit\n- [ ] Tests (unit + integration/E2E) green; coverage held\n- [ ] a11y (UI) / eval (AI) / migration-auditor (DB) as applicable\n- [ ] Docs/ADR + CHANGELOG + changeset updated\n- [ ] PR into development; green CI; reviewed"
chk release "Release" "- [ ] All PRs on development have changesets\n- [ ] CHANGELOG [Unreleased] current\n- [ ] development→main PR reviewed; CI green\n- [ ] Version Packages PR merged; versions/changelogs bumped\n- [ ] Tagged vX.Y.Z; deploy verified; rollback ready"
chk security "Security" "- [ ] Input validated (Zod); output encoded\n- [ ] RBAC + tenant guard on every route; deny by default\n- [ ] Secrets via manager; none in code/logs; gitleaks clean\n- [ ] Webhooks verified; rate limits set; secure headers/CORS\n- [ ] Audit log on mutations; threat model updated"
chk deployment "Deployment" "- [ ] CI green; migrations backward-compatible (expand/contract)\n- [ ] Env vars/secrets present in target env\n- [ ] Health/readiness pass post-deploy; smoke check\n- [ ] Observability (logs/metrics/traces) flowing\n- [ ] Rollback plan verified"
chk review "Code Review" "- [ ] Correctness: edge cases, error handling\n- [ ] Simplification: no dup/dead code; right abstraction\n- [ ] Security: validation, RBAC, secrets\n- [ ] Tests present and meaningful\n- [ ] Docs/CHANGELOG/changeset updated; CI green"

# ─────────────────────────── prompts ───────────────────────────
prompt_readme() { # category | focus
  cat > ".claude/prompts/$1/README.md" <<EOF
# Prompts — $1

Reusable prompt snippets for **$2** on this project. Keep them versioned; pair AI-facing prompts
with a golden case in \`llm-eval-harness\`.

## Starters
- "Given [context in docs/], $2: … Constrain to [scope]. Enforce our standards (STACK.md)."
- "Before coding, restate assumptions and acceptance criteria for [backlog id]."

## Conventions
- Reference canonical docs by path; don't restate them.
- Prefer smallest-slice-first; surgical changes; ask when underspecified.
EOF
}
prompt_readme planning "planning & decomposition"
prompt_readme coding "implementation"
prompt_readme debugging "root-cause debugging"
prompt_readme research "investigation & recommendations"
prompt_readme testing "test generation"
prompt_readme documentation "technical writing"
prompt_readme architecture "system design"
prompt_readme ui "UI generation & review"
prompt_readme code-review "diff review"
prompt_readme deployment "release & ops"
prompt_readme learning "onboarding & knowledge"

# ─────────────────────────── memory ───────────────────────────
cat > ".claude/memory/decisions.md" <<'EOF'
# Decisions (project memory)

Durable decisions not obvious from code. Formal ones are ADRs in `docs/adr/`; this is the quick log.

- **Stack**: see ADR-0001 (Fastify, tRPC+REST, Prisma+pgvector, Clerk-behind-adapter, LiteLLM+Langfuse, Vercel+Fly→AWS).
- **Branching**: GitFlow-lite — `main` (stable) · `development` (integration) · `hotfixes`.
- **Releases**: Changesets → Version Packages PR on `main`; packages are private (no npm publish).
- **Data sources**: official/licensed only; no ToS-violating scraping (X/LinkedIn/unofficial Google Trends).
- **AI quality**: no prompt/model/RAG change without a green `llm-eval-harness` run.
EOF
cat > ".claude/memory/conventions.md" <<'EOF'
# Conventions

- TypeScript strict; no `any` at boundaries; validate external input with Zod (`@aioi/validation`).
- LLM only via `@aioi/ai-sdk`; DB only via `@aioi/database`; auth/RBAC via `@aioi/auth`.
- Conventional Commits (scopes in `commitlint.config.cjs`); small PRs into `development`.
- RBAC + audit on every mutation; tenant scoping via `organizationId` + RLS.
- Design tokens only (no raw colors); WCAG 2.2 AA; chart colors via the `dataviz` skill.
- Every package-behavior change ships a changeset; update `CHANGELOG.md [Unreleased]`.
EOF
cat > ".claude/memory/glossary.md" <<'EOF'
# Glossary

- **Signal** — one raw item from one source (repo/post/paper/release/funding round).
- **Trend** — a deduplicated cluster of related signals; the unit users consume.
- **Scorecard** — the 10 dimension scores + confidence + evidence attached to a Trend.
- **Action Plan** — generated SaaS/app/extension/API/content/GTM/… suggestions for a Trend.
- **Entity** — a tracked Company/Model/Repo/Tool/MCP-server/Paper/Person.
- **Rubric version** — dated version of the scoring rubric; scores are cached per (trend, dimension, rubricVersion).
- **North-star** — Weekly Acted-On Opportunities.
- **Inverted dimensions** — competition/risk/difficulty (high = worse; labeled in UI).
EOF
cat > ".claude/memory/architecture.md" <<'EOF'
# Architecture notes (memory)

Pointer: canonical design is `docs/02-architecture/SYSTEM_DESIGN.md`. Quick reminders:

- Sync plane: web ⇄ api (tRPC internal, REST public). Async plane: scheduler → ingestion →
  `signal.ingested` → ai-service → `trend.updated` → notification-service.
- Bus is Redis Streams/BullMQ behind a thin interface (swappable to NATS/SQS).
- Global intelligence (Signal/Trend/Score/Entity) vs tenant data (Workspace/Watchlist/…) separated.
- Scoring composite is COMPUTED from sub-scores (never re-prompted); cached by rubric version.
EOF
cat > ".claude/memory/lessons.md" <<'EOF'
# Lessons learned

- **gitleaks-action** fails on `pull_request` events (needs PR-write perms) — run it on `push` only.
- **Dependabot grouped updates** can bundle breaking majors (e.g. Prisma 5→7) → limit groups to
  minor/patch and pin risky majors; adopt majors deliberately (see BACKLOG B-025).
- **Actions→create-PR** must be enabled (Settings→Actions) for the Changesets Release PR to open.
- **pnpm workspace tools** (vitest/eslint) resolve cleanly with `node-linker=hoisted`.
- **Prisma client** must be generated (`postinstall: prisma generate`) or CI install fails.
EOF

# ─────────────────────────── hooks (docs) ───────────────────────────
hook() { cat > ".claude/hooks/$1.md" <<EOF
# Hook — $2

**When:** $3

> These are documented process hooks. Executable Claude Code hooks live in \`settings.json\`; git
> hooks live in \`.husky/\`. Keep them in sync with this intent.

## Do
$4
EOF
}
hook before-task "Before Task" "Before starting any task." "- Read the backlog item + acceptance criteria and relevant docs.\n- Restate assumptions; identify affected \`@aioi/*\` packages and risks/ADRs.\n- Branch from \`development\` with a Conventional-Commit-friendly name."
hook after-task "After Task" "After completing a task, before opening a PR." "- Run the gate: \`pnpm typecheck && pnpm lint && pnpm test && pnpm build\`.\n- Update docs/ADR + CHANGELOG + add a changeset.\n- Update the backlog/roadmap; open a PR into \`development\`."
hook before-commit "Before Commit" "On every commit (also enforced by Husky)." "- lint-staged formats staged files; commit-msg validates Conventional Commits.\n- Never commit secrets; keep the diff focused.\n- Ensure new code paths have tests."
hook before-release "Before Release" "Before promoting \`development → main\`." "- Confirm every PR has a changeset and CHANGELOG is current.\n- Ensure CI is green on \`development\`; migrations are backward-compatible.\n- Prepare rollback; verify observability."

echo "Done. Generated .claude workspace + .agents charters."
