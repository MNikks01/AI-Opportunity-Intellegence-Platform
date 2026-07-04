# Market Research

**Phase 2 · Status: complete · Last updated: 2026-07-03**

> Market sizing below is directional (order-of-magnitude), assembled from public category
> knowledge, not a commissioned study. Treat numbers as planning inputs to be refined with real
> funnel data, per the Risk Register.

## Market framing

We sit at the intersection of three growing categories:

1. **Market/trend intelligence** (e.g., CB Insights, Exploding Topics, Glimpse) — established WTP.
2. **Developer/AI tooling intelligence** (e.g., GitHub trending trackers, model leaderboards).
3. **Opportunity/idea validation** (e.g., idea databases, niche-finder tools) — high churn, thin moats.

Our wedge is combining all three _specifically for the AI ecosystem_ with an action layer.

## TAM / SAM / SOM (directional)

- **TAM:** global software builders + creators + investors who research markets — tens of millions.
- **SAM:** English-speaking founders/indie devs/AI creators/agencies/investors actively building
  in AI — low millions.
- **SOM (Y1–Y2):** reachable via content/community/PLG — tens of thousands of activated users,
  targeting low-thousands of paying subscribers.

## Trends in our favor

- Explosion of AI releases → information overload is worsening (our problem is growing).
- PLG + "build-in-public" culture → strong content/SEO acquisition loop available.
- Cost of LLM inference falling → our AI-heavy synthesis becomes cheaper to run over time.
- MCP/agent ecosystem emerging → a fresh, under-covered surface we can own early (MCP discovery,
  agent marketplace) as a differentiator.

## Headwinds / risks

- **Data-source fragility:** X/LinkedIn/Google-Trends are ToS-restricted or lack official APIs;
  scraping is legally risky. We must lean on official/licensed sources (see `data-source-integration`).
- **Commoditization:** "AI trends newsletter" is crowded at the free/low end. Our moat must be the
  _scoring quality, action layer, and workspace/alerts retention_, not raw aggregation.
- **AI trust:** scores must be explainable or users won't act on them.
- **Model cost at scale:** per-trend multi-score generation is token-heavy → mitigated by caching,
  batching, cheaper models for drafts, and `headroom-ai`-style compression for tool/RAG context.

## Go-to-market motion (summary; full plan in MARKETING_PLAN)

- **Primary:** Product-Led Growth + content/SEO ("Suggested Keywords/Domains/Content" doubles as
  our own SEO engine — dogfooding). Free daily brief as top-of-funnel.
- **Secondary:** community (Reddit/Discord/HN build-in-public), referral + affiliate program.
- **Expansion:** teams/orgs seats, API, and investor/agency tiers.

## Pricing thesis (detail in PRICING_MODEL)

Freemium → Pro ($29/mo) → Team ($99/mo/seat-bundle) → Business/API (custom). Free tier is a real
acquisition and SEO asset (limited trends, daily brief), not a crippled demo.

## Buy signals we'll instrument from day one

Brief open rate, watchlist creation, alert setup, scorecard→"save/act" conversion, API key
creation, seat invites. These validate the Phase-1 riskiest assumptions with real behavior.
