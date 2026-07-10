# Milestones

**Phase 21 · Status: complete · Last updated: 2026-07-10**
**Traces to:** [Roadmap](ROADMAP.md) · [Sprint Plan](SPRINT_PLAN.md) · [Backlog](BACKLOG.md) · [Implementation Status](../01-product/IMPLEMENTATION_STATUS.md)

Product- and release-level milestones — the "are we there yet" view above the sprint/backlog grain. The
[ROADMAP](ROADMAP.md) tracks the 27 build phases; this tracks the shippable outcomes those phases add up
to. Legend: ✅ done · 🟡 in progress · ⬜ planned.

## Milestone timeline

| #       | Milestone                      | Outcome                                                                                                                                                         | Status |
| ------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| **M0**  | **Foundations complete**       | Phases 1–22: discovery → PRD/TRD → design system → DB/API/system/infra design → monorepo skeleton → standards → sprint plan. Docs before code, no placeholders. | ✅     |
| **M1**  | **Critical path proven**       | Ingest a real source (HN) → cluster → 10-dim eval-gated scorecard, end-to-end, tested. The product spine.                                                       | ✅     |
| **M2**  | **Read path + UI live**        | `@aioi/ui` design system, Trends dashboard + detail rendering real data in the browser; API (tRPC + REST).                                                      | ✅     |
| **M3**  | **CI/CD + governance**         | GitHub + CI (quality + security jobs), Changesets releases, Husky, Dependabot, GitFlow-lite; green on all branches.                                             | ✅     |
| **M4**  | **Auth, tenancy & compliance** | Clerk behind `@aioi/auth`, RBAC (ADR-0002), Postgres RLS (ADR-0003, hardened), audit logging, API keys, GDPR export/erasure.                                    | ✅     |
| **M5**  | **Autonomous engine**          | Scheduler → ingest (9 sources) → cluster → score → embed → momentum → alerts → daily briefs (in-app + email) → Slack/Discord digests.                           | ✅     |
| **M6**  | **Discovery surfaces**         | Keyword + semantic search, Golden Quadrant (demand × supply), momentum, trend comparison, related opportunities.                                                | ✅     |
| **M7**  | **Signal → Shipped**           | Action-plan generators (SaaS/API/content/GTM) + build-kit scaffold export.                                                                                      | ✅     |
| **M8**  | **Growth engine**              | SEO pages/sitemap/JSON-LD, OG images, `/report`, newsletter capture + send, RSS feed, `/changelog`.                                                             | ✅     |
| **M9**  | **Monetization**               | Stripe Free/Pro/Team × monthly/annual: checkout, signed webhook, Billing Portal, entitlements at write paths, usage meters.                                     | ✅     |
| **M10** | **Programmatic access**        | Public read API v1, API keys with plan-aware rate limiting, MCP server.                                                                                         | ✅     |
| **M11** | **Collaboration**              | Team seats/roles with RBAC + audit.                                                                                                                             | ✅     |
| **M12** | **Deployed public demo**       | Live on Vercel + Neon, keyless/stub mode, CD on push to main.                                                                                                   | ✅     |
| **M13** | **Roadmap phases closed**      | Phases 19–27 documentation complete: CI/CD, testing strategy, deployment, observability, scalability, milestones.                                               | ✅     |
| **M14** | **Retention + revenue levers** | Referral/affiliate loop, onboarding checklists, per-org weekly personalised digest, more sources (jobs/funding).                                                | ⬜     |
| **M15** | **Moat & expansion**           | Competitor/funding/market dashboards, model/prompt/MCP tracking, browser extension, deeper agent integrations.                                                  | ⬜     |
| **M16** | **Platform migrations**        | Prisma 7 (B-025), TypeScript 6 (B-026), Langfuse tracing enabled (B-007). Deferred by design until breaking changes are worked through.                         | ⬜     |

## Where we are

**M0–M13 complete.** The product is built, tested (194 tests green, DB tier exercised in CI),
released via Changesets, and running live. The roadmap's 27 phases are all delivered and documented.

**Next up (M14):** retention and revenue levers, led by a per-org personalised weekly digest and new
leading-indicator sources (hiring, funding). Nothing in M14–M16 is committed until it enters the
"Now" column of [BACKLOG](BACKLOG.md) with acceptance criteria.

**Held by design (M16):** the two major dependency migrations and Langfuse are intentionally deferred —
each carries breaking changes (Prisma 5→7 generator, TS 5→6 typecheck) or needs keys, and is tracked in
the backlog rather than forced prematurely.

## Working agreement

A milestone is "done" only when its features are implemented, tested, documented, and released — the same
bar the [ROADMAP](ROADMAP.md) applies to a phase. Update this file and the roadmap together when a
milestone lands.
