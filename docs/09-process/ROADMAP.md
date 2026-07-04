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
| 20  | Documentation            | full `docs/` set + `API_DOCUMENTATION`                                 | 🟡 (foundation done)                    |
| 21  | Phase Planning           | this file + `MILESTONES.md`                                            | 🟡                                      |
| 22  | Sprint Planning          | `09-process/SPRINT_PLAN.md`, `BACKLOG.md`                              | ✅                                      |
| 23  | Implementation           | code in `apps/`, `services/`, `packages/`                              | 🟡 (first vertical slice done)          |
| 24  | Testing                  | test suites + `08-quality/TESTING_STRATEGY.md`                         | 🟡 (slice tested; strategy doc pending) |
| 25  | Deployment               | `06-infra/DEPLOYMENT_GUIDE.md`                                         | ⬜                                      |
| 26  | Monitoring               | `06-infra/OBSERVABILITY.md`                                            | ⬜                                      |
| 27  | Scaling                  | `02-architecture/SCALABILITY_PLAN.md`                                  | ⬜                                      |

## Cross-cutting docs (produced alongside their phase)

Security guide + threat model (Phase 7 dir), RBAC/permissions/multi-tenancy, ADRs (ongoing),
observability/logging/monitoring, disaster recovery/backup, SEO/content/marketing/pricing,
legal templates (privacy/terms/cookie), risk register, changelog.

## Current position

**Phases 1–22 complete; Phase 23 implementation through Sprint 2 read-path + UI.** The full stack
now runs end-to-end and **renders in the browser**: ingest (live HN) → score (10-dim + composite) →
persist (Postgres) → serve (`@aioi/api` tRPC + REST) → render (`apps/web` Next.js RSC + `@aioi/ui`).
Implemented + verified: `@aioi/shared`, `validation`, `logger`, `ai-sdk` (LiteLLM + stub),
`ai-service` (scoring), `ingestion-service` (HN connector), `database` (Prisma repos, 23 tables,
pgvector), `api` (Fastify tRPC+REST), `ui` (tokens + components), `web` (Trends dashboard + detail).
**13/13 tests green; all packages strict-typecheck clean; Trends dashboard + Trend Detail scorecard
confirmed rendering real data in-browser.**

Next up: **auth** (`@aioi/auth` Clerk adapter + RBAC + tenant guard, B-014) so the app is gated and
multi-tenant; then the **retention loop** (watchlists/alerts/daily brief) and remaining Sprint-1
quality items (real embedding clustering B-006, `llm-eval-harness` golden gate B-009, Langfuse
tracing). Cross-cutting docs (TESTING_STRATEGY, CI/CD, security/threat-model, observability) alongside.

## Working agreements (apply every phase)

1. End each phase with a **review checklist**, **assumptions/decisions log**, and any new **ADRs**.
2. Update this roadmap + `BACKLOG.md` before moving on.
3. Decisions are recorded as ADRs in `docs/adr/`, never buried in prose.
4. Skills in use: `find-skills` to discover, `web-design-guidelines`/`frontend-design`/`ui-ux-pro-max`/
   `emil-design-eng` for design phases, `writing-guidelines` for docs, custom
   `data-source-integration`/`opportunity-scoring-engine`/`llm-eval-harness` for the ingestion+AI core.
