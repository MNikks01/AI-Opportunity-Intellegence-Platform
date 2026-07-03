# Product Requirements Document (PRD)

**Product:** AI Opportunity Intelligence Platform
**Phase 6 · Status: complete · Owner: Principal PM · Last updated: 2026-07-03**
**Related:** [Discovery](../00-discovery/PRODUCT_DISCOVERY.md) · [Personas](../00-discovery/PERSONAS.md) · [Competitive](../00-discovery/COMPETITIVE_ANALYSIS.md) · [Vision](VISION_AND_MISSION.md) · [TRD](TECHNICAL_REQUIREMENTS_DOCUMENT.md)

---

## 1. Overview
An AI-powered intelligence platform that continuously monitors the AI ecosystem, deduplicates raw
signals into **trends**, attaches a consistent **10-dimension opportunity scorecard + action plan**
to each, and surfaces them through dashboards, alerts, briefs, reports, workspaces, and an API.
It answers the ten discovery questions for every trend and tells users **what to do next.**

## 2. Goals & non-goals
**Goals**
- G1. Detect and cluster AI-ecosystem signals into trustworthy trends with < 24h latency (target < 1h for high-signal sources).
- G2. Produce an explainable, consistent scorecard + action plan for every trend.
- G3. Drive **acted-on opportunities** (north-star) via workspaces, alerts, briefs, and exports.
- G4. Ship a PLG funnel: free brief → Pro → Team/Business → API.
- G5. Maintain 100% data-source legal compliance and eval-gated AI quality.

**Non-goals (v1)** — general news feed; ToS-violating scraping; enterprise sales-led motion;
native mobile apps (responsive web + browser extension only).

## 3. Personas & priority
MVP focus **Maya (Indie Builder) → David (Founder) → Sofia (Creator)**; expansion Priya (Agency),
Marcus (Investor), Org Admin. See [Personas](../00-discovery/PERSONAS.md).

## 4. The core object model (product language)
- **Signal** — one raw item from one source (a repo, post, paper, release, funding round).
- **Trend** — a deduplicated cluster of related signals over time; the unit users consume.
- **Scorecard** — the 10 scores + confidence + evidence attached to a Trend.
- **Action Plan** — the generated suggestions (SaaS/app/extension/API/content/GTM/etc.).
- **Entity** — a tracked Company / Model / Repo / Tool / MCP server / Person the trend references.
- **Watchlist** — a user/team-curated set of trends/entities/topics with alerting.
- **Workspace** — personal or team container for watchlists, saved items, reports, settings.
- **Organization** — billing + membership + RBAC boundary (multi-tenant root).

## 5. The Trend Detail view → ten questions (traceability)
Every trend detail answers the brief's ten questions via defined components:

| Question | Component |
|---|---|
| What changed? | Executive Summary + signal timeline |
| Why does it matter? | Summary + "Why it matters" callout |
| Should I care? | Opportunity Score + persona-fit badges |
| Is it worth building? | Business + Difficulty scores + Suggested MVP/Tech Stack |
| Can I make money? | Monetization Score + Suggested Pricing/GTM |
| Suitable for content? | Creator + SEO scores + Suggested Content/Keywords |
| How difficult? | Difficulty Score + Suggested Architecture/DB schema |
| How competitive? | Competition Score + competitor list |
| Who is already winning? | Linked Entities (companies/repos/tools) + Funding |
| What should I do next? | Action Plan (SaaS/app/extension/API/domains/names/launch plan) |

## 6. AI scorecard specification
Ten scores, each `{ value 0–100, band, confidence, rationale, evidence[] }`, produced by the
`opportunity-scoring-engine` skill against a **versioned rubric** and validated by `llm-eval-harness`:

Opportunity (composite) · Business · Developer · Creator · SEO · Competition* · Monetization ·
Risk* · Difficulty* · Predicted Lifetime. *(**\*** inverted: high = worse; UI labels this clearly.)*

**Action Plan generators** (each is an eval-gated prompt): Suggested SaaS Ideas, Mobile Apps,
Chrome Extensions, APIs, Content, Keywords, Domains, Product Names, GTM Strategy, Pricing, Tech
Stack, MVP, PRD, Architecture, UI, Database Schema, Marketing Plan, Launch Plan.

**Hard requirements:** every score cites evidence; low-confidence scores are visually flagged;
scores are cached per (trend, rubricVersion) and only regenerated on material signal change or
rubric bump; composite computed from sub-scores, never re-guessed. See rubric + schema in
`.claude/skills/opportunity-scoring-engine/`.

## 7. Feature scope & prioritization (MoSCoW × release)
Full list in [FEATURE_PRIORITIZATION](FEATURE_PRIORITIZATION.md) (Phase 8); summary here.

### MVP (R1) — Must
- Ingestion for the **Tier-1 legally-clean sources** (GitHub Trending/Releases, Hacker News,
  Product Hunt, ArXiv, Hugging Face, Reddit via OAuth, package registries, RSS newsletters).
- Signal→Trend clustering; Trend Dashboard + **Trend Detail (scorecard + action plan)**.
- Opportunity Dashboard; Search (keyword) + **Semantic Search** (pgvector).
- Personal Workspace, Watchlists, Alerts (in-app + email), **Daily AI Brief** (email).
- Auth + Organizations + RBAC + billing (Free/Pro); Admin basics; audit logs.
- Landing page, docs, status page.

### R2 — Should
- Competitor / Market Intelligence / Funding / Research dashboards; AI Company/Model/Prompt tracking.
- Weekly Reports + exports (PDF); Team Workspace + seats; Slack/Discord/Telegram integrations.
- **MCP Server Discovery**; GitHub Repository Intelligence; Developer Tool Tracking.
- Public **API** + API keys; Browser Extension; RAG Search over Knowledge Base.
- Referral program; Growth/Analytics dashboards; Team/Business tiers.

### R3 — Could
- Agent Marketplace; Affiliate system; Organization Dashboard (advanced governance/SSO); Blog CMS,
  Help Center, Feedback Portal, public Roadmap/Changelog; advanced report white-labeling.

### Won't (v1)
Native mobile apps; ToS-restricted sources (X/LinkedIn scraping, unofficial Google Trends).

## 8. Data sources (product view; full legal/rate-limit matrix in TRD & skill)
Tiered by legality/feasibility (see `.claude/skills/data-source-integration/references/legality-classification.md`):
- **Tier 1 (build first, official/clean):** GitHub API + Releases, Hacker News API, Product Hunt
  API, ArXiv, Hugging Face Hub, Reddit OAuth, npm/PyPI, Papers with Code, RSS newsletters, model
  provider blogs/changelogs (OpenAI/Anthropic/Google/Mistral) via official feeds.
- **Tier 2 (licensed/partner or careful):** YouTube Data API (quota-managed), funding/startup data
  via licensed provider, TechCrunch/The Verge (links + metadata + short excerpts only).
- **Tier 3 (avoid/escalate):** X/Twitter (official paid API only, no scraping), LinkedIn (partner
  API only), Google Trends (licensed provider or compliant dataset only).

## 9. Functional requirements (selected, testable)
- FR-1 Ingestion jobs are idempotent, rate-limit-compliant, and record source legality classification.
- FR-2 A Trend must aggregate ≥2 corroborating signals or be flagged "early signal / low confidence."
- FR-3 Scorecard generation is triggered on trend create + on material signal change; results cached.
- FR-4 Every score displays band + confidence; evidence links resolve to source signals.
- FR-5 Users can create watchlists and receive alerts (in-app + email; Slack/Discord/Telegram in R2)
  on new trends/score changes matching saved filters.
- FR-6 Daily Brief is generated per user from their watchlists + top trends; open/click tracked.
- FR-7 Semantic search returns ranked trends/entities via embeddings; keyword search via Postgres FTS.
- FR-8 Organizations support roles (Owner, Admin, Member, Billing, Viewer) enforced on every route.
- FR-9 All privileged/mutating actions write an audit-log entry (actor, org, action, target, ip, ts).
- FR-10 Public API mirrors read models with per-key rate limits + usage metering for billing.

## 10. Non-functional requirements (NFRs)
- **Performance:** dashboard TTFB < 500ms p75; API read p95 < 300ms; brief generation < 60s/user batch.
- **Availability:** 99.9% for the web app + read API; ingestion may degrade gracefully.
- **Scalability:** ingestion horizontally scalable; scorecard generation queue-backed and rate-limited.
- **Security:** OWASP ASVS L2 baseline; RBAC on every route; encrypted secrets; audit logs; see SECURITY_GUIDE.
- **Privacy/Legal:** GDPR/CCPA-ready; DSAR/delete supported; 100% sources legality-classified.
- **AI quality:** no prompt/model change ships without a green `llm-eval-harness` run; scores explainable.
- **Cost:** tracked LLM cost per active user; caching + cheaper draft models + context compression.
- **Accessibility:** WCAG 2.2 AA for all app surfaces.
- **Observability:** structured logs, metrics, traces (OTel), LLM traces (Langfuse), health/readiness.

## 11. Monetization (summary; detail in PRICING_MODEL)
Free (daily brief, limited trends, 1 watchlist) → **Pro $29/mo** (full scores, unlimited watchlists,
alerts, semantic search) → **Team $99/mo** (seats, shared workspaces, reports, integrations) →
**Business/API** (custom, API quota, SSO, white-label reports). Referral + affiliate in R2/R3.

## 12. Success metrics
- **North-star:** Weekly Acted-On Opportunities.
- **Activation:** % new users who set ≥1 watchlist + open ≥1 brief within 7 days (target ≥40%).
- **Retention:** W4 retention ≥25% (Pro); brief open rate ≥35%.
- **Quality:** score user-rating ≥4/5; eval pass rate 100% on release gate.
- **Monetization:** free→paid ≥3% (R2), net revenue retention ≥100% (Team/Business).

## 13. Release plan
R1 MVP → private beta (10 design partners) → public beta → GA. R2 growth surfaces + API +
integrations. R3 marketplace + governance + content/community surfaces. Tracked in [ROADMAP](../09-process/ROADMAP.md).

## 14. Assumptions & open questions
- **A1:** Tier-1 sources provide enough signal for compelling trends without X/LinkedIn. *(Validate in beta.)*
- **A2:** $29 Pro price clears for Maya/Sofia. *(Validate with pricing tests.)*
- **A3:** pgvector suffices for semantic/RAG at MVP scale before a dedicated vector DB. *(TRD ADR.)*
- **Q1:** Clerk vs Auth.js for auth/orgs — decided in [ADR-0001](../adr/ADR-0001-core-stack.md).
- **Q2:** Which licensed provider for funding + Google-Trends-equivalent data — spike in R2.

## 15. Phase-6 review checklist
- [x] Every core feature mapped to a persona and a release.
- [x] Ten discovery questions traced to Trend Detail components.
- [x] Scorecard spec references the implementing skill + schema.
- [x] Data sources tiered by legality; no ToS-violating source in MVP.
- [x] NFRs are measurable; success metrics defined; north-star chosen.
- [x] Open questions have an owner/decision path (ADR or spike).
