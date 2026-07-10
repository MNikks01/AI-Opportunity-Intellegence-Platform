# Build Roadmap & Phase Tracker

Single source of truth for how this repository evolves. We follow the 27-step process from the
master brief. **A phase is not "done" until its deliverables exist, are internally consistent,
and its review checklist passes.** No phase is skipped; no placeholder content.

Legend: ✅ complete · 🟡 in progress · ⬜ not started

## Phase map

| #   | Step                     | Deliverable(s)                                                         | Status                                  |
| --- | ------------------------ | ---------------------------------------------------------------------- | --------------------------------------- |
| 1   | Product Discovery        | `00-discovery/PRODUCT_DISCOVERY.md`                                    | ✅                                      |
| 2   | Market Research          | `00-discovery/MARKET_RESEARCH.md`                                      | ✅                                      |
| 3   | User Personas            | `00-discovery/PERSONAS.md`                                             | ✅                                      |
| 4   | Competitive Analysis     | `00-discovery/COMPETITIVE_ANALYSIS.md`                                 | ✅                                      |
| 5   | Vision                   | `01-product/VISION_AND_MISSION.md`                                     | ✅                                      |
| 6   | PRD                      | `01-product/PRODUCT_REQUIREMENTS_DOCUMENT.md`                          | ✅                                      |
| 7   | User Stories             | `01-product/USER_STORIES.md`                                           | ✅                                      |
| 8   | Feature Prioritization   | `01-product/FEATURE_PRIORITIZATION.md`                                 | ✅                                      |
| 9   | UX Flows                 | `03-design/UX_FLOWS.md`                                                | ✅                                      |
| 10  | Wireframes               | `03-design/WIREFRAMES.md`                                              | ✅                                      |
| 11  | Design System            | `03-design/DESIGN_SYSTEM.md`                                           | ✅                                      |
| 12  | Information Architecture | `03-design/INFORMATION_ARCHITECTURE.md`                                | ✅                                      |
| 13  | Database Design          | `04-data/DATABASE_DESIGN.md`, `04-data/ERD.md`                         | ✅                                      |
| 14  | API Design               | `05-api/API_DESIGN.md`, `05-api/openapi.yaml`                          | ✅                                      |
| 15  | System Design            | `02-architecture/SYSTEM_DESIGN.md` (HLD/LLD)                           | ✅                                      |
| 16  | Infrastructure           | `06-infra/INFRASTRUCTURE.md`                                           | ✅                                      |
| 17  | Folder Structure         | monorepo skeleton (`apps/ services/ packages/ infra/`)                 | ✅                                      |
| 18  | Development Standards    | `08-quality/CODE_GUIDELINES.md`, `CLAUDE.md`                           | ✅                                      |
| 19  | CI/CD                    | `.github/workflows/ci.yml` (baseline); full `06-infra/CICD.md` pending | 🟡                                      |
| 20  | Documentation            | full `docs/` set + `API_DOCUMENTATION`                                 | 🟡 (docs set + IMPLEMENTATION_STATUS)   |
| 21  | Phase Planning           | this file + `MILESTONES.md`                                            | 🟡                                      |
| 22  | Sprint Planning          | `09-process/SPRINT_PLAN.md`, `BACKLOG.md`                              | ✅                                      |
| 23  | Implementation           | code in `apps/`, `services/`, `packages/`                              | 🟡 (core loop + growth + monetization)  |
| 24  | Testing                  | test suites + `08-quality/TESTING_STRATEGY.md`                         | 🟡 (slice tested; strategy doc pending) |
| 25  | Deployment               | `06-infra/DEPLOYMENT_GUIDE.md`                                         | ⬜                                      |
| 26  | Monitoring               | `06-infra/OBSERVABILITY.md`                                            | ⬜                                      |
| 27  | Scaling                  | `02-architecture/SCALABILITY_PLAN.md`                                  | ⬜                                      |

## Cross-cutting docs (produced alongside their phase)

Security guide + threat model (Phase 7 dir), RBAC/permissions/multi-tenancy, ADRs (ongoing),
observability/logging/monitoring, disaster recovery/backup, SEO/content/marketing/pricing,
legal templates (privacy/terms/cookie), risk register, changelog.

## Current position

**Phases 1–22 complete; Phase 23 implementation feature-complete across the core loop, growth
engine, collaboration, programmatic access, and a full three-tier monetization surface.** The
platform runs end-to-end and renders in the browser. **262 tests green; all workspaces
strict-typecheck clean; 19 build targets pass; released via Changesets on `main`.**

> For the full narrative — what's implemented, decisions taken, business model, and forward roadmap —
> see **[`../01-product/IMPLEMENTATION_STATUS.md`](../01-product/IMPLEMENTATION_STATUS.md)**.

Autonomous pipeline (scheduler-driven): ingest from **9 sources** (HN, GitHub, Hugging Face, arXiv,
npm, PyPI, YouTube, Reddit, Product Hunt) → **cluster signals into trends** (embed + cosine, B-006) → score
(10-dimensional composite, eval-gated B-009) → embed (pgvector) → momentum snapshots → auto-evaluate
alerts → daily briefs (in-app **and emailed**) → per-org Slack/Discord digests. Discovery surfaces:
keyword + semantic search, the **Golden Quadrant** (demand × supply) with demand mining, momentum,
trend comparison, and **related opportunities** (entity + embedding). Signal→Shipped: action-plan
generators plus the **build-kit scaffold export**. Growth: SEO pages/sitemap/JSON-LD, OG images,
`/report`, newsletter capture and send. Collaboration: **team seats/roles** with RBAC and audit.
Programmatic: **public read API v1**, **API keys** with plan-aware rate limiting, and an **MCP
server**. Monetization: **Free/Pro/Team, monthly or annual** — Stripe checkout, a signature-verified
webhook, the Billing Portal, entitlements enforced at the write paths, and usage meters plus history
(ADR-0004). Auth & compliance: Clerk (frontend, verifier, webhook, enforced sign-in) with API keys,
RBAC (ADR-0002), Postgres **RLS** (ADR-0003, hardened), audit logging, and **GDPR export/erasure**
(B-023). Foundation: `@aioi/ui` design system, Redis cache, CI/CD, GitFlow. Every external integration
(Clerk, Stripe, Resend, LiteLLM, Slack/Discord) sits behind an adapter plus Stub, so CI stays green
with no keys and each activates on config — see
[../10-setup/ENV_SETUP.md](../10-setup/ENV_SETUP.md) and
[../10-setup/RUNNING_LOCALLY.md](../10-setup/RUNNING_LOCALLY.md).

Next up (see IMPLEMENTATION_STATUS §7): alert **email delivery** (needs a migration), an **RSS/Atom
feed**, and a public **`/changelog`**. Remaining by design: Langfuse tracing (B-007, keys-gated) and
the deferred major migrations — Prisma 7 (B-025) and TypeScript 6 (B-026).

## Working agreements (apply every phase)

1. End each phase with a **review checklist**, **assumptions/decisions log**, and any new **ADRs**.
2. Update this roadmap + `BACKLOG.md` before moving on.
3. Decisions are recorded as ADRs in `docs/adr/`, never buried in prose.
4. Skills in use: `find-skills` to discover, `web-design-guidelines`/`frontend-design`/`ui-ux-pro-max`/
   `emil-design-eng` for design phases, `writing-guidelines` for docs, custom
   `data-source-integration`/`opportunity-scoring-engine`/`llm-eval-harness` for the ingestion+AI core.
