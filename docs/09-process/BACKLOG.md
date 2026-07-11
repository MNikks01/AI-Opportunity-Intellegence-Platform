# Product Backlog

**Phase 22 · Status: living document · Last updated: 2026-07-03**
Ordered, estimated backlog. IDs are stable. SP = story points (relative). Status: ⬜ todo · 🟡 doing · ✅ done.
Traces to [User Stories](../01-product/USER_STORIES.md) + [Prioritization](../01-product/FEATURE_PRIORITIZATION.md).

## Now (Sprint 0–1) — critical path

| ID    | Item                                                                                  | Epic  | SP  | Status                                                               |
| ----- | ------------------------------------------------------------------------------------- | ----- | --- | -------------------------------------------------------------------- |
| B-001 | `pnpm install` + Turbo pipeline runs green                                            | infra | 2   | ✅                                                                   |
| B-002 | `@aioi/shared`: core domain types (SourceRecord, Trend, Score enums)                  | E2    | 2   | ✅                                                                   |
| B-003 | `@aioi/validation`: Zod schemas (SourceRecord, Score) mirroring score.schema.json     | E2    | 3   | ✅                                                                   |
| B-004 | `@aioi/database`: Prisma migrate (23 tables, pgvector+pgcrypto) + client              | E2    | 3   | ✅                                                                   |
| B-005 | HN ingestion connector + MSW tests (happy/429/malformed/empty/idempotent)             | E2    | 5   | ✅                                                                   |
| B-006 | Signal->Trend clustering (embed + heuristic)                                          | E2    | 5   | done (embed + greedy cosine + scheduler job; real embedder swaps in) |
| B-007 | `@aioi/ai-sdk`: LiteLLM client + stub provider + structured output (Langfuse pending) | E2/AI | 5   | 🟡                                                                   |
| B-008 | `scoreTrend()` per opportunity-scoring-engine (10 dims + composite + cache)           | E3    | 8   | ✅                                                                   |
| B-009 | llm-eval-harness: golden case + CI gate                                               | AI    | 3   | done (golden invariants + determinism gate in CI)                    |
| B-024 | Prisma-backed `SignalRepository` (repository.prisma.ts) wired to ingestion            | E2    | 3   | ✅                                                                   |

## Next (Sprint 2) — read path + UI

| ID    | Item                                                                   | Epic | SP  | Status                                                              |
| ----- | ---------------------------------------------------------------------- | ---- | --- | ------------------------------------------------------------------- |
| B-010 | `@aioi/api` Fastify + tRPC `trends.list/bySlug`; REST `/api/v1/trends` | E2   | 5   | ✅                                                                  |
| B-011 | Redis read-model cache for dashboards                                  | perf | 3   | ✅                                                                  |
| B-012 | `@aioi/ui` tokens + core components                                    | UI   | 8   | done (Card/Badge/ScoreBar/Scorecard/TrendCard + Button + DataTable) |
| B-013 | `apps/web` Trend Dashboard + Trend Detail (RSC, real data)             | E2   | 8   | ✅                                                                  |
| B-014 | `@aioi/auth` Clerk adapter + RBAC guard + tenant guard                 | E1   | 5   | ✅ (adapter+RBAC+guard+RLS+API-key+Clerk verifier)                  |
| B-015 | Personal workspace bootstrap on signup                                 | E5   | 3   | ✅ (bootstrapUser + Clerk user.created webhook)                     |

## Later (Sprint 3+) — retention + monetization

| ID    | Item                                                                                                     | Epic  | SP  | Status                                                                                              |
| ----- | -------------------------------------------------------------------------------------------------------- | ----- | --- | --------------------------------------------------------------------------------------------------- |
| B-016 | Watchlists + WatchlistItems CRUD                                                                         | E4    | 5   | ✅                                                                                                  |
| B-017 | Alerts engine (match rules → in-app/email)                                                               | E4    | 5   | ✅ (engine + in-app notifications + API + web UI + pipeline auto-eval; email/Slack = separate epic) |
| B-018 | Daily Brief generation + delivery + open tracking                                                        | E4    | 8   | done (in-app brief + open tracking + API + web + email delivery)                                    |
| B-019 | Search: keyword (FTS) + semantic (pgvector) endpoints                                                    | E2    | 5   | ✅ (keyword FTS + semantic pgvector/HNSW + API + web; StubEmbedder offline, LiteLLM in prod)        |
| B-020 | Billing Free/Pro via Stripe + entitlements                                                               | E8    | 8   | done (entitlements + enforcement + API + web + Stripe checkout + webhooks)                          |
| B-021 | Action-plan generators (SaaS/API/content/GTM)                                                            | E3    | 8   | done (generator + persist + API + web + eval gate)                                                  |
| B-022 | Audit logging middleware (all mutations)                                                                 | E9    | 3   | ✅                                                                                                  |
| B-023 | GDPR export/delete jobs                                                                                  | E9    | 5   | done (export + hard delete + RLS hardening)                                                         |
| B-025 | Prisma 5→7 migration (breaking client/generator; ignored in dependabot until done)                       | infra | 5   | ✅ (driver adapter @prisma/adapter-pg + prisma.config.ts; 62 DB-integration tests green vs live PG) |
| B-026 | TypeScript 5→6 migration (fails typecheck; ignored in dependabot until done)                             | infra | 3   | ✅ (bumped to ^6.0.3; per-package rootDir for TS5011; no-undef off in shared eslint)                |
| B-027 | Runtime connects as a non-superuser DB role (`aioi_app`) + `APP_DATABASE_URL` so RLS enforces (ADR-0003) | infra | 3   | ✅                                                                                                  |

### Deferred next-majors (held in Dependabot by design)

- **TypeScript 7 (follows B-026).** Spiked on `spike/typescript-7` (2026-07-10, TS 7.0.2, the native
  Go-port compiler). **Our code is already TS-7-clean:** `typecheck` passed 31/31 with zero changes and
  all 288 tests passed. **Blocked purely by tooling that doesn't support the native compiler yet:**
  (1) `typescript-eslint` 8.63 caps its peer at `typescript <6.1.0` and its parser crashes on TS 7
  (`TypeError: … reading 'Cjs'`), breaking `lint`; (2) **Next.js 16** doesn't recognize the TS 7 package
  (`next build` → "required package typescript not installed"), breaking `build`. **Trigger to adopt:**
  a `typescript-eslint` release whose peer allows `>=7` **and** Next.js announcing TS 7 support — then
  adoption should be a near-trivial version bump. Held in `dependabot.yml` until both land.
- **Prisma 8 (follows B-025).** Not released yet — latest is `prisma` 7.8.0 (only `7.9.0-dev`
  pre-releases exist). Nothing to do; we're current on Prisma 7. Revisit when 8.x ships.

## Growth + monetization wave (R1.5 — shipped since B-023)

Delivered as small PRs to `development` and released; see
[`../01-product/IMPLEMENTATION_STATUS.md`](../01-product/IMPLEMENTATION_STATUS.md) §4 for the full
inventory and the [CHANGELOG](../../CHANGELOG.md) `[Unreleased]` for per-PR notes.

- **Sources:** arXiv + npm (now 8 total). **Momentum** snapshots + sparklines.
- **Golden Quadrant** + demand mining; **trend comparison**; **related opportunities** (entity +
  embedding).
- **Build-kit scaffold export.**
- **Growth engine:** SEO pages/sitemap/JSON-LD, OG images, `/report`, newsletter capture + weekly send.
- **Collaboration:** team seats/roles + RBAC + audit; per-org Slack/Discord digest config.
- **Programmatic:** public read API v1, API keys + plan-aware metering, MCP server.
- **Monetization (ADR-0004):** Free/Pro/Team × monthly/annual, Stripe checkout + webhook + Portal,
  entitlement enforcement at the write paths, usage meters + 14-day history.

## Next up (queued, pre-decomposition)

- **Alert email delivery** — deliver `EMAIL`-channel alert notifications via Resend; needs a
  `Notification.emailedAt` migration + a delivery job/workflow (mirrors the newsletter send).
- **RSS/Atom feed** of new high-opportunity trends (no migration).
- **Public `/changelog`** product surface (R3) — curated release notes.
- Make the Fastify API checkout interval-aware (currently monthly-Pro only).

## M15-A — Supply-side tracking (models / MCP servers / repos)

Decomposed from the M15 "model/prompt/MCP tracking" milestone. Design: **[ADR-0005](../adr/ADR-0005-supply-side-tracking.md)**
(Accepted). Builds on the existing `Entity`/`EntityType` model and OFFICIAL sources (HF, GitHub, arXiv) —
no new data source, no legality gate. Track the AI supply side with the same momentum rigor as trends.
**Shipped** (PR #250).

| ID    | Item                                                                                      | Epic | SP  | Status |
| ----- | ----------------------------------------------------------------------------------------- | ---- | --- | ------ |
| B-028 | `EntitySnapshot` model + migration + per-run snapshot job (D1/D2)                         | E2   | 5   | ✅     |
| B-029 | `getEntityMomentumMap` + `listTrackedEntities` repositories (D1/D3)                       | E2   | 5   | ✅     |
| B-030 | HF/GitHub → `MODEL`/`REPO`/`MCP_SERVER` entity upserts + MCP detection (D2)               | E2   | 5   | ✅     |
| B-031 | `/entities` momentum leaderboard + entity-detail sparkline (D3)                           | UI   | 5   | ✅     |
| B-032 | (phase 2) watch + alert on a tracked entity, via existing watchlist/alert primitives (D4) | E4   | 5   | ⬜     |

## M15-B — Funding signal (SEC EDGAR Form D)

Decomposed from the M15 "competitor/funding dashboards" milestone. Design: **[ADR-0006](../adr/ADR-0006-funding-signal.md)**
(Proposed). Adds a **new OFFICIAL source** — SEC EDGAR Form D (US private funding rounds), free +
public-domain — as a leading **demand** signal through the existing pipeline. **US-only in v1**; global
(paid) funding is a separate future ADR.

| ID    | Item                                                                                       | Epic | SP  | Status |
| ----- | ------------------------------------------------------------------------------------------ | ---- | --- | ------ |
| B-033 | `sec-edgar` Form D connector (EDGAR FTS + AI-keyword filter) + MSW tests + legality header | E2   | 8   | ⬜     |
| B-034 | Register the source (`OFFICIAL`) + wire into the refresh pipeline + `/sources`             | E2   | 3   | ⬜     |
| B-035 | Funding → demand-axis contribution in clustering/quadrant (integration-tested)             | E2   | 5   | ⬜     |
| B-036 | `/funding` surface: recent AI funding events + linked trends                               | UI   | 5   | ⬜     |
| B-037 | (v2) competitor/market dashboard; (later) global/paid funding source ADR                   | E2   | 8   | ⬜     |

## R2/R3 epics (not yet decomposed)

Competitor/Funding/Market/Research dashboards · Browser extension · Telegram
integration · Weekly Reports + PDF export · Referral/Affiliate · Agent Marketplace · Admin/Org
governance + **SSO** + a **Business** tier · Blog/Help/Feedback/public Roadmap · PyPI + job-posts +
funding sources.

## Grooming rules

- Nothing enters "Now" without acceptance criteria + a linked user story.
- AI items carry an eval-harness sub-task. Migration items carry a migration-auditor sub-task.
- Re-prioritize each sprint review against the north-star (Weekly Acted-On Opportunities).
