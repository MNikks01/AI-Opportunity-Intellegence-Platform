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
| B-009 | llm-eval-harness smoke: golden case + CI gate — _determinism smoke test only_         | AI    | 3   | 🟡                                                                   |
| B-024 | Prisma-backed `SignalRepository` (repository.prisma.ts) wired to ingestion            | E2    | 3   | ✅                                                                   |

## Next (Sprint 2) — read path + UI

| ID    | Item                                                                              | Epic | SP  | Status                                             |
| ----- | --------------------------------------------------------------------------------- | ---- | --- | -------------------------------------------------- |
| B-010 | `@aioi/api` Fastify + tRPC `trends.list/bySlug`; REST `/api/v1/trends`            | E2   | 5   | ✅                                                 |
| B-011 | Redis read-model cache for dashboards                                             | perf | 3   | ✅                                                 |
| B-012 | `@aioi/ui` tokens + core components (Card, Badge, ScoreBar, Scorecard, TrendCard) | UI   | 8   | 🟡 (DataTable/Button pending)                      |
| B-013 | `apps/web` Trend Dashboard + Trend Detail (RSC, real data)                        | E2   | 8   | ✅                                                 |
| B-014 | `@aioi/auth` Clerk adapter + RBAC guard + tenant guard                            | E1   | 5   | ✅ (adapter+RBAC+guard+RLS+API-key+Clerk verifier) |
| B-015 | Personal workspace bootstrap on signup                                            | E5   | 3   | ✅ (bootstrapUser + Clerk user.created webhook)    |

## Later (Sprint 3+) — retention + monetization

| ID    | Item                                                                                                     | Epic  | SP  | Status                                                                                              |
| ----- | -------------------------------------------------------------------------------------------------------- | ----- | --- | --------------------------------------------------------------------------------------------------- |
| B-016 | Watchlists + WatchlistItems CRUD                                                                         | E4    | 5   | ✅                                                                                                  |
| B-017 | Alerts engine (match rules → in-app/email)                                                               | E4    | 5   | ✅ (engine + in-app notifications + API + web UI + pipeline auto-eval; email/Slack = separate epic) |
| B-018 | Daily Brief generation + delivery + open tracking                                                        | E4    | 8   | 🟡 (in-app brief + open tracking + API + web; email delivery next)                                  |
| B-019 | Search: keyword (FTS) + semantic (pgvector) endpoints                                                    | E2    | 5   | ✅ (keyword FTS + semantic pgvector/HNSW + API + web; StubEmbedder offline, LiteLLM in prod)        |
| B-020 | Billing Free/Pro via Stripe + entitlements                                                               | E8    | 8   | 🟡 (entitlements + plan persistence + enforcement + API + web; Stripe checkout/webhooks next)       |
| B-021 | Action-plan generators (SaaS/API/content/GTM)                                                            | E3    | 8   | 🟡 (generator + persist + API + web + tests; richer fields + eval next)                             |
| B-022 | Audit logging middleware (all mutations)                                                                 | E9    | 3   | ✅                                                                                                  |
| B-023 | GDPR export/delete jobs                                                                                  | E9    | 5   | done (export + hard delete + RLS hardening)                                                         |
| B-025 | Prisma 5→7 migration (breaking client/generator; ignored in dependabot until done)                       | infra | 5   | ⬜                                                                                                  |
| B-026 | TypeScript 5→6 migration (fails typecheck; ignored in dependabot until done)                             | infra | 3   | ⬜                                                                                                  |
| B-027 | Runtime connects as a non-superuser DB role (`aioi_app`) + `APP_DATABASE_URL` so RLS enforces (ADR-0003) | infra | 3   | ✅                                                                                                  |

## R2/R3 epics (not yet decomposed)

Competitor/Funding/Market/Research dashboards · Model/Prompt/MCP tracking · Public API keys +
metering · Browser extension · Slack/Discord/Telegram integrations · Weekly Reports + PDF export ·
Team workspace + seats · Referral/Affiliate · Agent Marketplace · Admin/Org governance + SSO ·
Blog/Help/Feedback/public Roadmap/Changelog.

## Grooming rules

- Nothing enters "Now" without acceptance criteria + a linked user story.
- AI items carry an eval-harness sub-task. Migration items carry a migration-auditor sub-task.
- Re-prioritize each sprint review against the north-star (Weekly Acted-On Opportunities).
