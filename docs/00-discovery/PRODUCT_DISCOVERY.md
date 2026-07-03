# Product Discovery

**Phase 1 · Status: complete · Last updated: 2026-07-03**

## Problem statement
The AI ecosystem moves faster than any individual can track. New models, tools, MCP servers,
repos, papers, and funding rounds appear daily across a dozen fragmented channels (GitHub, HN,
Reddit, Product Hunt, ArXiv, X, newsletters, funding DBs). The people who most need to act on
this — founders, indie developers, creators, agencies, investors — spend hours doing manual,
shallow research and still miss the window. Existing tools tell you **what happened**; nobody
tells you **whether it's worth your time and money, and what to do next.**

## Jobs to be done (JTBD)
- *When* a new AI capability appears, *I want to* know quickly if it's a real trend or noise,
  *so I can* decide whether to invest attention.
- *When* I'm choosing what to build, *I want to* see validated, scored opportunities with
  competition and monetization signals, *so I can* pick a winner instead of guessing.
- *When* I need content/product ideas, *I want to* get concrete SaaS/app/extension/content
  suggestions with keywords and GTM, *so I can* move from insight to action in minutes.
- *When* I'm tracking a space, *I want to* get alerts and briefs, *so I can* stay ahead without
  living in 12 browser tabs.

## The ten questions the product must answer (from the brief)
What changed? · Why does it matter? · Should I care? · Is it worth building? · Can I make money
from it? · Is it suitable for content? · How difficult is it? · How competitive is it? · Who is
already winning? · What should I do next?

Every trend detail view maps 1:1 to these ten questions (see PRD §Trend Detail).

## What this is / is not
- **Is:** an AI-powered *intelligence and decision* platform — continuous monitoring + scoring +
  actionable recommendations, with workspaces, alerts, reports, and an API.
- **Is not:** a news site, an AI-tools directory, or a Google Trends clone. Those are commodity
  inputs; our value is the synthesis, scoring, and "what to do next" layer on top.

## Value hypothesis
If we continuously ingest the AI ecosystem, deduplicate signals into **trends**, and attach a
consistent, explainable **opportunity scorecard + action plan** to each, then target users will
pay a recurring subscription because we replace hours of manual research with a decision they can
trust — and surface opportunities *before* they're obvious.

## Riskiest assumptions (to validate early)
1. **Signal→trend clustering** produces trends users agree are "real." (Mitigation: golden-set + human review, `opportunity-scoring-engine`.)
2. **Scores are trusted** enough to act on. (Mitigation: every score cites evidence + confidence; `llm-eval-harness` prevents drift.)
3. **Willingness to pay** at $29–$99/mo for the target segments. (Mitigation: pricing tests, design-partner interviews.)
4. **Data-source legality/stability** — several key sources (X, LinkedIn, Google Trends) are ToS-restricted. (Mitigation: `data-source-integration` legality gate; licensed/official sources only.)

## Success criteria (discovery → MVP)
- 10 design partners across ≥3 personas confirm the scorecard changes a real decision.
- ≥60% of surveyed users rate trend relevance ≥4/5.
- A daily brief a user would actually open (measured: brief open rate ≥35%).
