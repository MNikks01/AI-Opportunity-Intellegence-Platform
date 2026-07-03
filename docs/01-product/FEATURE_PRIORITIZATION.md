# Feature Prioritization

**Phase 8 · Status: complete · Last updated: 2026-07-03**
**Method:** RICE for ordering within a release + MoSCoW for release gating. Traces to
[PRD §7](PRODUCT_REQUIREMENTS_DOCUMENT.md) and [User Stories](USER_STORIES.md).

RICE = (Reach × Impact × Confidence) ÷ Effort. Reach = users touched/quarter (relative 1–5),
Impact 0.5–3, Confidence 0.5–1, Effort in person-weeks (relative). Scores are relative planning
aids, not absolutes.

## R1 (MVP) — Must have
| Feature | Epic | Reach | Impact | Conf | Effort | RICE | Notes |
|---|---|---|---|---|---|---|---|
| Signal→Trend ingestion (Tier-1 sources) | E2 | 5 | 3 | 0.8 | 8 | 1.5 | Foundation; nothing works without it |
| Trend Detail: scorecard + action plan | E2/E3 | 5 | 3 | 0.9 | 6 | 2.25 | **Core value & differentiator** |
| Score explainability (evidence+confidence) | E2 | 5 | 3 | 0.9 | 2 | 6.75 | Cheap, unlocks trust → highest RICE |
| Trend + Opportunity dashboards | E2/E3 | 5 | 2 | 0.9 | 4 | 2.25 | Primary surfaces |
| Search (keyword + semantic/pgvector) | E2 | 4 | 2 | 0.8 | 3 | 2.13 | Discovery |
| Watchlists + alerts (in-app/email) | E4 | 4 | 3 | 0.8 | 4 | 2.4 | Retention engine |
| Daily AI Brief (email) | E4 | 5 | 2 | 0.8 | 3 | 2.67 | Top-of-funnel + retention |
| Auth + Orgs + RBAC + audit logs | E1/E9 | 5 | 2 | 0.9 | 5 | 1.8 | Clerk accelerates |
| Billing (Free/Pro via Stripe) | E8 | 4 | 2 | 0.9 | 3 | 2.4 | Monetization on day one |
| Personal workspace | E5 | 5 | 2 | 0.9 | 2 | 4.5 | Cheap, needed |
| Landing + docs + status page | E9 | 5 | 1 | 0.9 | 3 | 1.5 | Acquisition + trust |
| GDPR export/delete | E9 | 3 | 1 | 0.9 | 2 | 1.35 | Legal non-negotiable |

**R1 cutline rationale:** everything above is required to deliver the PRD's core loop (relevant
trend → trusted score → action → retention) plus legal/monetization basics. Score explainability and
personal workspace are "cheap wins" (high RICE) pulled in early.

## R2 — Should have
Competitor / Market Intelligence / Funding / Research dashboards · AI Company/Model/Prompt tracking ·
MCP Server Discovery · GitHub Repo Intelligence · Dev Tool Tracking · Weekly Reports + PDF export ·
Team workspace + seats · Slack/Discord/Telegram integrations · Public API + keys · Browser extension ·
RAG search + Knowledge Base · Referral program · Growth/Analytics dashboards · Team/Business tiers.

*Ordering within R2 (top first):* Team workspace+seats → Public API → Competitor/Funding dashboards →
MCP Discovery → integrations → Weekly Reports → extension → referral.

## R3 — Could have
Agent Marketplace · Affiliate system · Org Dashboard (advanced governance + SSO) · Blog CMS · Help
Center · Feedback Portal · public Roadmap/Changelog UI · advanced white-label reports.

## Won't (v1)
Native mobile apps · ToS-restricted sources (X/LinkedIn scraping, unofficial Google Trends) ·
sales-led enterprise motion.

## Dependencies (build order constraints)
1. Ingestion + object model **must** precede scoring; scoring **must** precede action plan + briefs.
2. Auth/orgs precede workspaces/billing/API keys.
3. `packages/ai-sdk` + `llm-eval-harness` precede any scoring/RAG feature (quality gate).
4. Design system (Phase 11) precedes dashboard implementation.

## Assumptions
- Tier-1 sources yield compelling trends (PRD A1). If beta disproves this, promote a Tier-2 licensed
  source into R1 — this is the biggest scope risk.

## Review checklist
- [x] Every R1 feature has a P0 story + persona + PRD reference.
- [x] Build-order dependencies explicit; AI quality gate sequenced before AI features.
- [x] Legal/monetization essentials inside R1, not deferred.
