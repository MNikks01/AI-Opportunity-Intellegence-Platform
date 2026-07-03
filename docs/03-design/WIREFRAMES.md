# Wireframes (low-fidelity)

**Phase 10 · Status: complete · Last updated: 2026-07-03**

Low-fi ASCII wireframes for the key screens. High-fidelity component specs come with the
[Design System](DESIGN_SYSTEM.md). Layout uses the app shell: left nav + top bar + content.
Aesthetic target: Linear/Vercel/Stripe-quality density and calm (original identity — see Design System).

## App shell
```
┌──────────────────────────────────────────────────────────────────────────┐
│ [◧ Logo]  ⌘K Search…            🔔  ☾  [Workspace ▼]        [Avatar ▼]     │  top bar
├──────────┬───────────────────────────────────────────────────────────────┤
│ Home     │                                                                 │
│ Trends   │   << content region >>                                          │
│ Opps     │                                                                 │
│ Competitors                                                                │
│ Funding  │                                                                 │
│ Reports  │                                                                 │
│ Watchlists                                                                 │
│ ───────  │                                                                 │
│ Settings │                                                                 │
│ Admin*   │                                                                 │
└──────────┴───────────────────────────────────────────────────────────────┘
```

## W1 — Trend Dashboard
```
Trends                                     [Source ▼][Topic ▼][Score ▼][Date ▼]  [Sort: Newest ▼]
┌───────────────────────────────────────────────┐  ┌──────────────────────────┐
│ ● MCP servers for local models      ▲ rising   │  │  Trend of the day        │
│   Opp 82 · Comp 34 · Monet 71 · Conf ●●●○       │  │  ────────────────        │
│   src: GitHub, HN · 3h ago         [☆ watch]    │  │  [mini scorecard]        │
├───────────────────────────────────────────────┤  │                          │
│ ● On-device speech models           ▲          │  │  Your watchlists         │
│   Opp 74 · Comp 41 · Monet 63 · Conf ●●○○       │  │  • Agents (3 new)        │
│   src: HF, ArXiv · 5h ago          [☆ watch]    │  │  • MCP (1 new)           │
├───────────────────────────────────────────────┤  └──────────────────────────┘
│ … virtualized list, skeletons on load …        │
└───────────────────────────────────────────────┘
Empty: "No trends match these filters — clear filters or broaden topics."
```

## W2 — Trend Detail (answers the 10 questions)
```
← Trends /  MCP servers for local models          [☆ Watch] [⤓ Export] [Share]
┌───────────────────────────────────────────────────────────────────────────┐
│ Executive Summary  ······································· What changed / Why  │
│ "MCP server implementations for local LLMs surged 4× this week across…"     │
├───────────────────────────────────────────┬───────────────────────────────┤
│ SCORECARD                                  │ SIGNALS (evidence timeline)    │
│  Opportunity  ████████░░ 82  ●●●○          │  • gh: repo X  (+1.2k ★/wk)    │
│  Business     ███████░░░ 71  ●●●○ ▸why     │  • hn: "Show HN…" 340 pts      │
│  Monetization ███████░░░ 71                │  • arxiv: paper Y              │
│  Competition* ███░░░░░░░ 34 (low = good)   │  • hf: model Z                 │
│  Difficulty*  █████░░░░░ 52                │                               │
│  Creator/SEO/Developer/Risk/Lifetime …     │  Entities: 4 companies, 6 repos│
├───────────────────────────────────────────┴───────────────────────────────┤
│ ACTION PLAN            [SaaS][App][Extension][API][Content][GTM][Stack][MVP]│
│  ▸ Suggested SaaS: "…"   ▸ Keywords: …   ▸ Domains: …   ▸ Product names: …   │
└───────────────────────────────────────────────────────────────────────────┘
* inverted score — labeled inline. Each score row expands to rationale + cited signals.
Pending score → row shows skeleton + "scoring…" + confidence-unknown badge.
```

## W3 — Opportunity Dashboard
```
Opportunities            Filter: [Comp: Low][Monet: High][Difficulty: ≤Med]   Sort: Opportunity ▼
┌───────────────┬───────────────┬───────────────┐   cards grid, drill-through to Trend Detail
│ Opp 82        │ Opp 79        │ Opp 76        │   each card: title, top-3 scores, persona-fit,
│ low comp      │ high monet    │ weekend build │   [save] [watch]
└───────────────┴───────────────┴───────────────┘
```

## W4 — Command palette (⌘K) & global search
```
┌ ⌘K ─────────────────────────────────────────┐
│ Search trends, companies, models, actions…  │
│ ── Trends ───────────────────────────────    │
│  ▸ MCP servers for local models              │
│ ── Entities ─────────────────────────────    │
│  ▸ Company: …   ▸ Model: …                    │
│ ── Actions ──────────────────────────────    │
│  ▸ Create watchlist   ▸ Go to Billing        │
└──────────────────────────────────────────────┘
```

## W5 — Onboarding
```
Step 1/2  What best describes you?   ( ) Builder ( ) Founder ( ) Creator ( ) Agency ( ) Investor
Step 2/2  Pick topics you care about  [Agents][MCP][RAG][Vision][Voice][DevTools][Funding] …  [Continue]
```

## W6 — Reports / Weekly (R2) & Admin (P0 basics)
Reports: header KPIs row → charts (Recharts) → trend table (TanStack) → [Export PDF].
Admin: users/orgs table, audit-log viewer, feature flags, source health.

## Review checklist
- [x] Trend Detail visibly answers all ten discovery questions.
- [x] Inverted scores labeled; pending/empty/error states shown.
- [x] Command palette + global search present (per brief).
- [x] Every screen fits the app shell + responsive collapse (nav → drawer on mobile).
