# Implementation Status & Product Direction

_Last updated: 2026-07-09._

This is the single, human-readable answer to "where are we, how did we get here, and where are we
going." It complements — and does not replace — the phase tracker in
[`09-process/ROADMAP.md`](../09-process/ROADMAP.md), the itemised
[`09-process/BACKLOG.md`](../09-process/BACKLOG.md), and the decision records in
[`adr/`](../adr/). When those disagree with this file, the ROADMAP/BACKLOG/ADRs win and this file is
stale — fix it.

---

## 1. What this product is

**AI Opportunity Intelligence Platform** — it watches where AI ships _first_ (repos, model hubs,
papers, packages, launches, developer chatter), detects what is breaking out **before it becomes a
search trend**, scores the opportunity on 10 dimensions with evidence, and hands the user a
ready-to-build plan and scaffold prompt.

The audience is builders (indie hackers, founders, product teams) who want to know **what to build
next** and get from a weak signal to running code with as little friction as possible.

## 2. The USP — our north star (unchanged)

Grounded in July 2026 competitive research. The market gap: trend tools (Exploding Topics/Glimpse)
read _lagging_ search-volume signals and don't say what to build; complaint-miners (BigIdeasDB) are
demand-only and backward-looking; validators (IdeaProof) are reactive; enterprise intel (CB Insights)
is analyst-priced. **Nobody joins early supply signal → scored buildable opportunity.** We do, on
three pillars:

1. **Leading indicators, not lagging** — read what builders ship (repos, model hubs, papers,
   packages, launches, dev chatter) before it's a keyword.
2. **Supply × Demand → the "Golden Quadrant"** — track supply, mine articulated demand
   ("I wish there was…", "Ask HN", "alternative to…"), cross them, and surface the
   high-demand / low-supply **build-now** region. This is the signature feature.
3. **Signal → Shipped** — close the loop: discover → score → plan → one-click **scaffold prompt**
   exported to Claude Code / Cursor / v0.

**North-star metric:** Weekly Acted-On Opportunities (a user watchlists, exports a scaffold, or
opens a build plan).

## 3. Where we are, in one line

**All 27 roadmap phases complete.** Implementation is feature-complete across the core loop, the growth
engine, collaboration, programmatic access, and a full three-tier monetization surface, and the
closing-phase docs (CI/CD, testing strategy, deployment, observability, scalability, milestones) now
match the shipped system. The platform runs end-to-end, renders in the browser, and is deployed live.
**194 automated tests green (the DB-integration tier is exercised against real Postgres+pgvector in
CI); all workspaces strict-typecheck clean; build targets pass.** Every external integration (Clerk,
Stripe, Resend, LiteLLM, Slack/Discord) sits behind an adapter + deterministic Stub, so CI is green with
zero keys and each activates on configuration.

## 4. What is implemented

Grouped by product area. Each line is live in the codebase and covered by the gate.

### 4.1 Core intelligence pipeline (the engine)

- **10 official, legality-classified sources** — HackerNews (incl. the monthly **Who's Hiring**
  thread), GitHub, Hugging Face, **arXiv**, **npm**, **PyPI**, YouTube, Reddit, Product Hunt.
  Official/licensed APIs only; no ToS-violating scraping.
- **Clustering** — signals about the same thing are grouped into a trend by meaning (embeddings +
  greedy cosine).
- **Scoring** — every trend rated on **10 opportunity dimensions** + a composite, evidence-grounded,
  behind an **eval-harness gate** in CI (no prompt/model/RAG change ships without a green run).
- **Embeddings** — pgvector; `StubEmbedder` offline, LiteLLM in production.
- **Momentum** — an append-only `TrendSnapshot` history yields a signal-velocity + 7-day delta
  (Accelerating / Steady / Cooling), shown as a sparkline on every card.
- **Backfill re-score** — opt-in, batched, queue-rotating re-score of Stub-era scores to the real
  model, in place; a manual GitHub Action with a dry-run estimate.

### 4.2 Discovery surfaces (supply × demand)

- **The Golden Quadrant** (`/quadrant`) — demand (viability) × supply (competition) scatter, with
  the **build-now** region highlighted and a ranked list.
- **Demand mining** — detects demand-expressing signals and blends them into the demand axis; rows
  show an "N wanted" tag.
- **Trends browse + detail** — keyword + semantic search, source/status/sort filters, watch toggle,
  CSV/JSON export, 10-dimension scorecards, entities, momentum, and **related opportunities**
  (shared-entity matches filled with embedding-similar trends).
- **Trend comparison** — up to 4 trends side-by-side, best-value-per-row highlighted.

### 4.3 Signal → Shipped

- **Action-plan generators** — SaaS/API/content/GTM ideas, MVP scope, names, tech stack (eval-gated).
- **Build kit (scaffold export)** — the plan assembled into a rigorous, ready-to-paste engineering
  brief (role, requirements, standards, security, performance, UX, definition of done, decision
  priority) with copy + download. The last mile of the loop.

### 4.4 Growth engine (compounding acquisition)

- **Public SEO pages** — dynamic `sitemap.xml` + `robots.txt`, per-page metadata (canonical, OG,
  Twitter), JSON-LD on trend pages.
- **Social share images** — dynamic branded Open Graph cards per trend + homepage (`next/og`).
- **State of AI Opportunities report** (`/report`) — a shareable, SEO-indexed landscape snapshot.
- **Newsletter** — homepage signup (idempotent subscribe/unsubscribe + token page) and a weekly
  Resend send with `List-Unsubscribe` (gated on `RESEND_API_KEY`).
- **Landing + pricing pages** — USP hero, differentiation pillars, feature grid, and the pricing
  comparison (rendered from live entitlements).

### 4.5 Collaboration

- **Team members & roles** — invite by email, roles (owner/admin/member/billing/viewer), remove;
  every mutation RBAC-gated and audit-logged; pending invites shown.
- **Per-org digest delivery** — connect a Slack/Discord incoming webhook and toggle the daily
  digest per org (host-validated, never reflected back); the cron delivers per org.

### 4.6 Programmatic access

- **Public read API (v1)** — self-documenting index, `/trends`, `/trends/{slug}`, `/opportunities`,
  consistent JSON envelope + CORS.
- **API keys** — create (one-time secret reveal), list, revoke on `/team`; sha256-hashed at rest.
- **Rate limiting** — DB-backed per-key daily quota (`ApiKeyUsage`), `X-RateLimit-*` headers, 429
  over quota; the quota is **plan-aware**.
- **MCP server** (`@aioi/mcp-server`) — stdio Model Context Protocol server exposing
  `search_trends` / `get_trend` / `list_build_now_opportunities` to coding agents; wraps the HTTP
  API, no DB credentials.

### 4.7 Monetization (three tiers × two intervals, end-to-end)

- **Plans + entitlements** — `@aioi/billing` is the single source of truth: **Free / Pro / Team**,
  each granting watchlists, alerts, seats, semantic search, daily brief, and an API quota. See
  [ADR-0004](../adr/ADR-0004-billing-and-entitlements.md).
- **Enforcement at the write paths** — `createWatchlist`, `createAlert`, and `inviteMember` throw
  `PlanLimitError` at the limit (surfaced as inline upgrade prompts); semantic search is gated on
  both the web and tRPC surfaces.
- **Stripe checkout + webhook** — self-serve upgrade opens Stripe Checkout; a signature-verified
  webhook is the source of truth for plan changes (plan carried in subscription metadata — no
  price→plan table); cancel/manage via the Billing Portal. Falls back to an offline Stub.
- **Annual billing** — monthly/annual toggle, annual = 10× monthly (two months free).
- **Usage visibility** — usage-vs-limit meters + a 14-day API-usage sparkline on `/billing`.

### 4.8 Platform & security

- **Auth** — Clerk (frontend + verifier + `user.created` webhook + enforced sign-in), keyless dev
  mode; API-key principal for programmatic calls.
- **Multi-tenancy** — Postgres **Row-Level Security** ([ADR-0003](../adr/ADR-0003-row-level-security.md)),
  runtime on a restricted `aioi_app` role; `withOrgContext` on every tenant write; SECURITY DEFINER
  functions for the few cross-tenant reads.
- **RBAC** ([ADR-0002](../adr/ADR-0002-auth-rbac-model.md)) + **audit logging** on every
  mutating/privileged action.
- **GDPR** — export + hard erasure.
- **Foundation** — `@aioi/ui` design system, Redis read-model cache, CI/CD, GitFlow, Changesets.

## 5. Decisions we've taken (log)

Formal records live in [`adr/`](../adr/). The load-bearing decisions:

| Decision                                                                                                                                         | Where                                                   | Rationale                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Monorepo (pnpm + Turborepo), Next.js App Router + Fastify/tRPC, Prisma + Postgres + pgvector, LiteLLM gateway                                    | [ADR-0001](../adr/ADR-0001-core-stack.md)               | One toolchain; RSC for SEO + speed; a provider-agnostic model gateway.                                                                       |
| Clerk auth + role-based RBAC                                                                                                                     | [ADR-0002](../adr/ADR-0002-auth-rbac-model.md)          | Managed auth; permissions checked at the edge and in resolvers.                                                                              |
| Postgres RLS for tenant isolation, restricted runtime role                                                                                       | [ADR-0003](../adr/ADR-0003-row-level-security.md)       | Defense-in-depth; one missed `where` clause can't leak a tenant.                                                                             |
| Billing = plans + entitlements as the single source of truth; enforce at write paths; metadata-driven Stripe plan resolution; provider Stub seam | [ADR-0004](../adr/ADR-0004-billing-and-entitlements.md) | The page, the API, and the enforcement all read the same numbers; the webhook needs no price→plan table; the whole flow is testable offline. |
| Every external integration behind an adapter + deterministic Stub                                                                                | ADR-0001, ENV_SETUP                                     | CI green with zero keys; each service activates on configuration; flows are verifiable offline.                                              |
| Docs before code, phase by phase; decisions as ADRs, not prose                                                                                   | ROADMAP, CLAUDE.md                                      | Traceability; no placeholder architecture.                                                                                                   |
| Deploy target is the Next.js web app on Vercel; cron via GitHub Actions; Neon Postgres                                                           | INFRASTRUCTURE, DEPLOY                                  | MVP-optimised, documented exit ramps; the standalone Fastify API is a secondary surface.                                                     |

## 6. Business model

| Plan     | Price            | Watchlists | Alerts    | Seats | Semantic search | API / day per key |
| -------- | ---------------- | ---------- | --------- | ----- | --------------- | ----------------- |
| **Free** | $0               | 5          | 10        | 1     | —               | 1,000             |
| **Pro**  | $29/mo ($290/yr) | Unlimited  | Unlimited | 3     | ✓               | 50,000            |
| **Team** | $99/mo ($990/yr) | Unlimited  | Unlimited | 25    | ✓               | 200,000           |

Prices and limits are defined once in `@aioi/billing` and rendered live everywhere. To sell for
real, set the Stripe keys + price ids (see [ENV_SETUP](../10-setup/ENV_SETUP.md)); the enforcement
path is already in place.

## 7. Where we're going

Prioritised by impact against the north star. Nothing here is committed until it enters "Now" in the
backlog with acceptance criteria.

### Recently shipped (former "near term")

- **Alert email delivery** ✅ — `Notification.emailedAt` + the hourly `deliver-alerts` job/workflow now
  email undelivered `EMAIL`-channel alerts per org (mirrors the newsletter send; no-op without keys).
- **RSS/Atom feed** ✅ — `/feed.xml` serves the newest scored opportunities (hourly ISR), a
  no-migration distribution channel for feed readers and automation (Zapier/n8n).
- **Public "what's new" changelog** ✅ — `/changelog` renders curated release notes.

Also shipped since (the M14 retention/revenue levers): the **per-org personalised weekly digest** (a
`weekly-digest` job over each org's watchlists, distinct from the generic newsletter), the **referral
loop** (`Organization.referralCode` + `referredByCode`), the **`/start` onboarding checklist**, the
**HN "Who is hiring?"** leading-indicator source (10th source, keyless HN Algolia), and a **Business
tier** (4th plan) — so the monetization ladder is Free/Pro/Team/Business.

### Near term (next) — M15 moat & expansion

_Future scope, uncommitted until it enters "Now" with acceptance criteria (CLAUDE.md: no speculative
features):_

- **Competitor / funding / market dashboards** and model/prompt/MCP tracking.
- **Browser extension** and deeper agent integrations.
- **Funding-announcement source** (a licensed/official feed) to complement the hiring signal.

### Mid term (retention + revenue levers)

- **Referral / affiliate** loop and in-product onboarding checklists.
- **Weekly personalised digest** per org (based on watchlists), distinct from the generic newsletter.
- **More sources** — PyPI, job posts (hiring is a leading indicator), funding announcements.
- **Admin/org governance + SSO** for the Team/Business motion; a **Business** tier.

### Long term (moat + expansion)

- **Competitor / funding / market dashboards** and model/prompt/MCP tracking (R2 epics).
- **Browser extension** and deeper agent integrations.
- **Weekly Reports + PDF export** for teams.
- Deferred platform migrations: **Prisma 7** (B-025) and **TypeScript 6** (B-026), held until their
  breaking changes are worked through.

## 8. Known gaps / honest caveats

- The standalone Fastify API service is a **secondary** surface; the primary self-serve flow lives in
  the Next.js web app. Some capabilities (e.g. annual checkout) are wired in the web app only.
- Langfuse tracing (B-007) is keys-gated and not yet enabled.
- Going live on payments, email, and Slack requires the operator to set the respective keys; until
  then those paths run in Stub/test mode by design.
