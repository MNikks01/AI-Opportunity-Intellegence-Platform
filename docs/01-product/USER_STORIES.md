# User Stories

**Phase 7 · Status: complete · Last updated: 2026-07-03**
**Traces to:** [PRD](PRODUCT_REQUIREMENTS_DOCUMENT.md) · [Personas](../00-discovery/PERSONAS.md)

Stories follow INVEST. IDs group by epic. Each has acceptance criteria (AC) in Given/When/Then.
Priority: **P0** = MVP (R1), **P1** = R2, **P2** = R3. Persona codes: Maya(P1)=M, David=D, Sofia=S,
Priya=Pr, Marcus=Mc, Admin=A.

---

## Epic E1 — Onboarding & Auth

- **E1-1 (P0, all)** As a new user, I can sign up with email or SSO so I can access the platform.
  - AC: Given the signup page, when I complete signup, then an Organization + personal Workspace are
    created and I land on an onboarding flow. MFA optional; email verified.
- **E1-2 (P0, all)** As a new user, I pick my persona + interest topics so my brief and trends are relevant.
  - AC: Given onboarding, when I select persona + ≥3 topics, then my default watchlist + brief are seeded.
- **E1-3 (P0, A)** As an org owner, I can invite teammates with a role so they can collaborate.
  - AC: invite email; invitee joins org with assigned role; audit-logged.

## Epic E2 — Trend discovery

- **E2-1 (P0, M/D/S)** As a user, I can browse the Trend Dashboard sorted by recency/score so I see what's moving.
  - AC: list virtualized; filters (source, topic, score band, date); sort; empty/loading/error states.
- **E2-2 (P0, all)** As a user, I can open a Trend Detail and get the scorecard + action plan so I can decide.
  - AC: all 10 scores render with band + confidence; evidence links resolve; action plan sections present;
    the ten discovery questions are all answered on the page.
- **E2-3 (P0, M/S)** As a user, I can see _why_ a score is what it is so I trust it.
  - AC: each score expands to rationale + cited evidence signals; low-confidence visibly flagged.
- **E2-4 (P0, all)** As a user, I can keyword- and semantic-search trends/entities so I can find a space fast.
  - AC: keyword (Postgres FTS) + semantic (pgvector) results ranked; < 500ms p75; typo tolerance.

## Epic E3 — Opportunity & action

- **E3-1 (P0, M/D)** As a builder, I can open the Opportunity Dashboard filtered by low competition/high
  monetization so I can pick what to build.
  - AC: filter by any score dimension + band; sort by composite Opportunity; save to workspace.
- **E3-2 (P0, M/D)** As a builder, I can view Suggested SaaS/Extension/API/Tech-Stack/MVP for a trend so I can start.
  - AC: each generator renders; regenerate respects cache; export (copy/markdown; PDF in P1).
- **E3-3 (P1, D/Pr)** As a founder/agency, I can export a trend's plan as a PDF/deck to brief stakeholders.

## Epic E4 — Watchlists, alerts, briefs

- **E4-1 (P0, all)** As a user, I can save trends/entities/topics to a watchlist so I can track them.
- **E4-2 (P0, all)** As a user, I can set alerts on a watchlist so I'm notified of new trends/score changes.
  - AC: channel = in-app + email (P0); Slack/Discord/Telegram (P1); dedupe; digest vs instant.
- **E4-3 (P0, S/M)** As a user, I receive a Daily AI Brief email tailored to my watchlists + top trends.
  - AC: generated per user; open/click tracked; unsubscribe/preferences honored; < 60s batch/user.
- **E4-4 (P1, D/Pr)** As a user, I receive a Weekly Report summarizing my tracked spaces with charts.

## Epic E5 — Workspaces, teams, org

- **E5-1 (P0, all)** As a user, I have a personal workspace for saved items, watchlists, and settings.
- **E5-2 (P1, D/Pr/A)** As a team, we share a workspace (watchlists, saved items, reports) with role-based access.
- **E5-3 (P1, A)** As an org admin, I manage seats, roles, and billing from an Organization Dashboard.

## Epic E6 — Tracking surfaces (R2)

- **E6-1 (P1, D/Mc)** Competitor Dashboard: track companies + their moves/funding.
- **E6-2 (P1, Mc)** Funding Dashboard: rounds by category/company with trend links.
- **E6-3 (P1, M/D)** MCP Server Discovery + Agent Marketplace + Model/Prompt tracking + GitHub Repo Intelligence.

## Epic E7 — API, extension, integrations (R2)

- **E7-1 (P1, D/Pr)** As a developer, I can create a scoped API key and query trends/scores with per-key rate limits + usage metering.
- **E7-2 (P1, S/M)** As a user, I can use a browser extension to score/save the page's AI topic.
- **E7-3 (P1, all)** As a team, we connect Slack/Discord/Telegram to receive alerts/briefs in-channel.

## Epic E8 — Billing & growth (R2/R3)

- **E8-1 (P0)** As a user, I can upgrade to Pro via Stripe and manage my subscription.
- **E8-2 (P1)** As a user, I can refer others and earn credits (referral program).
- **E8-3 (P2)** As a partner, I can join the affiliate program and track conversions.

## Epic E9 — Admin, trust, ops

- **E9-1 (P0, A)** As an admin, I can view audit logs and manage users/orgs.
- **E9-2 (P0, all)** As a user, I can request my data export / account deletion (GDPR/CCPA).
- **E9-3 (P0, all)** As a visitor, I can view the public status page + changelog. (Roadmap/Help/Feedback = P2.)

## Review checklist

- [x] Every P0 story maps to an MVP feature in the PRD and a persona.
- [x] Trust stories (E2-3) and legal stories (E9-2) present, not deferred.
- [x] Each story has testable AC; states (empty/loading/error) called out for UI stories.
