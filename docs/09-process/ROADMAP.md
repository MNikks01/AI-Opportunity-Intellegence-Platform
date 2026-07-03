# Build Roadmap & Phase Tracker

Single source of truth for how this repository evolves. We follow the 27-step process from the
master brief. **A phase is not "done" until its deliverables exist, are internally consistent,
and its review checklist passes.** No phase is skipped; no placeholder content.

Legend: ✅ complete · 🟡 in progress · ⬜ not started

## Phase map

| # | Step | Deliverable(s) | Status |
|---|---|---|---|
| 1 | Product Discovery | `00-discovery/PRODUCT_DISCOVERY.md` | ✅ |
| 2 | Market Research | `00-discovery/MARKET_RESEARCH.md` | ✅ |
| 3 | User Personas | `00-discovery/PERSONAS.md` | ✅ |
| 4 | Competitive Analysis | `00-discovery/COMPETITIVE_ANALYSIS.md` | ✅ |
| 5 | Vision | `01-product/VISION_AND_MISSION.md` | ✅ |
| 6 | PRD | `01-product/PRODUCT_REQUIREMENTS_DOCUMENT.md` | ✅ |
| 7 | User Stories | `01-product/USER_STORIES.md` | ✅ |
| 8 | Feature Prioritization | `01-product/FEATURE_PRIORITIZATION.md` | ✅ |
| 9 | UX Flows | `03-design/UX_FLOWS.md` | ✅ |
| 10 | Wireframes | `03-design/WIREFRAMES.md` | ✅ |
| 11 | Design System | `03-design/DESIGN_SYSTEM.md` | ✅ |
| 12 | Information Architecture | `03-design/INFORMATION_ARCHITECTURE.md` | ✅ |
| 13 | Database Design | `04-data/DATABASE_DESIGN.md`, `04-data/ERD.md` | ✅ |
| 14 | API Design | `05-api/API_DESIGN.md`, `05-api/openapi.yaml` | ✅ |
| 15 | System Design | `02-architecture/SYSTEM_DESIGN.md` (HLD/LLD) | ✅ |
| 16 | Infrastructure | `06-infra/INFRASTRUCTURE.md` | ✅ |
| 17 | Folder Structure | monorepo skeleton (`apps/ services/ packages/ infra/`) | ✅ |
| 18 | Development Standards | `08-quality/CODE_GUIDELINES.md`, `CLAUDE.md` | ✅ |
| 19 | CI/CD | `.github/workflows/ci.yml` (baseline); full `06-infra/CICD.md` pending | 🟡 |
| 20 | Documentation | full `docs/` set + `API_DOCUMENTATION` | 🟡 (foundation done) |
| 21 | Phase Planning | this file + `MILESTONES.md` | 🟡 |
| 22 | Sprint Planning | `09-process/SPRINT_PLAN.md`, `BACKLOG.md` | ✅ |
| 23 | Implementation | code in `apps/`, `services/`, `packages/` | 🟡 (first vertical slice done) |
| 24 | Testing | test suites + `08-quality/TESTING_STRATEGY.md` | 🟡 (slice tested; strategy doc pending) |
| 25 | Deployment | `06-infra/DEPLOYMENT_GUIDE.md` | ⬜ |
| 26 | Monitoring | `06-infra/OBSERVABILITY.md` | ⬜ |
| 27 | Scaling | `02-architecture/SCALABILITY_PLAN.md` | ⬜ |

## Cross-cutting docs (produced alongside their phase)
Security guide + threat model (Phase 7 dir), RBAC/permissions/multi-tenancy, ADRs (ongoing),
observability/logging/monitoring, disaster recovery/backup, SEO/content/marketing/pricing,
legal templates (privacy/terms/cookie), risk register, changelog.

## Current position
**Phases 1–22 complete; Phase 23 first vertical slice done and running.** The critical path is
proven end-to-end **against a live source**: real Hacker News ingestion → dedupe → `Trend` →
eval-gated 10-dimension scorecard with a computed composite. Implemented + tested:
`@aioi/shared`, `@aioi/validation`, `@aioi/logger`, `@aioi/ai-sdk` (LiteLLM + deterministic stub),
`@aioi/ai-service` (scoring engine), `@aioi/ingestion-service` (HN connector + repo). Prisma
migrated against real Postgres 16 + pgvector (23 tables, both extensions). **10/10 tests green,
strict typecheck clean.**

Next up: **finish Sprint 1** (real embedding-based clustering B-006; wire `llm-eval-harness` golden
gate B-009; Langfuse tracing in `ai-sdk`; Prisma-backed `SignalRepository`), then **Sprint 2** —
`@aioi/api` (Fastify + tRPC read models) + `@aioi/ui` + `apps/web` Trend Dashboard/Detail + auth.
Cross-cutting docs (TESTING_STRATEGY, CI/CD, security/threat-model, observability) authored alongside.

## Working agreements (apply every phase)
1. End each phase with a **review checklist**, **assumptions/decisions log**, and any new **ADRs**.
2. Update this roadmap + `BACKLOG.md` before moving on.
3. Decisions are recorded as ADRs in `docs/adr/`, never buried in prose.
4. Skills in use: `find-skills` to discover, `web-design-guidelines`/`frontend-design`/`ui-ux-pro-max`/
   `emil-design-eng` for design phases, `writing-guidelines` for docs, custom
   `data-source-integration`/`opportunity-scoring-engine`/`llm-eval-harness` for the ingestion+AI core.
