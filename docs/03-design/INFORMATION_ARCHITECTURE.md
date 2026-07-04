# Information Architecture

**Phase 12 · Status: complete · Last updated: 2026-07-03**
**Traces to:** [UX Flows](UX_FLOWS.md) · [Wireframes](WIREFRAMES.md) · [PRD](../01-product/PRODUCT_REQUIREMENTS_DOCUMENT.md)

## 1. Product surfaces (top-level)

Three app zones + public zone:

- **App (`app.*`)** — the authenticated product (dashboards, trend detail, workspace).
- **Admin (`app.*/admin`)** — internal ops (role-gated).
- **Marketing (`www.*`)** — landing, pricing, blog, changelog, roadmap.
- **Docs (`docs.*`)** — product + API documentation, help center.
- **Status (`status.*`)** — status page (separate for availability).

## 2. Primary navigation (left nav, authenticated)

```
Home (personalized overview + brief)
Trends            → Trend Detail
Opportunities     → Trend Detail (opportunity lens)
Competitors  (R2) → Entity Detail (company)
Funding      (R2)
Research     (R2)
Reports      (R2)
Watchlists        → Watchlist Detail
──────────────
Search (⌘K everywhere)
Settings (Profile, Workspace, Team, API keys, Billing, Notifications)
Admin* (role-gated)
```

Secondary/utility (top bar): global search (⌘K), notifications, theme toggle, workspace switcher,
account menu. Tracking surfaces (Models/Prompts/MCP/Agents/Repos/Dev-tools) group under **Research**
in R2 to avoid nav sprawl.

## 3. Sitemap & URL structure (REST-friendly, shareable)

```
/                              Home
/trends                        Trend Dashboard
/trends/:trendId               Trend Detail (shareable, SSR for SEO on public teasers)
/opportunities                 Opportunity Dashboard
/competitors, /competitors/:id (R2)
/funding, /research            (R2)
/entities/:type/:id            Company | Model | Repo | Tool | MCP server | Person
/watchlists, /watchlists/:id
/reports, /reports/:id         (R2)
/search?q=…&mode=keyword|semantic
/settings/{profile|workspace|team|api|billing|notifications}
/admin/{users|orgs|audit|flags|sources}   (role-gated)
/api/v1/…                      Public REST API (OpenAPI)
Marketing: /(pricing|blog|blog/:slug|changelog|roadmap|legal/{privacy|terms|cookies})
```

## 4. Content taxonomy

- **Topics** (facets): Agents, MCP, RAG, Vision, Voice/Speech, DevTools, Models, Funding, Research,
  Infra, Safety… — used for onboarding, filters, watchlists, and SEO landing pages.
- **Entity types:** Company, Model, Repo, Tool, MCP server, Paper, Person.
- **Trend ↔ Entity ↔ Signal** relationships power drill-down and "who's winning."
- **Score dimensions** are a fixed controlled vocabulary (see scoring rubric).

## 5. Search & findability

- **⌘K command palette:** trends + entities + actions + navigation (fuzzy).
- **Global search page:** keyword (Postgres FTS) + semantic (pgvector) toggle; facet filters by
  topic/entity/score band/date.
- SEO: public, SSR/ISR topic + trend-teaser pages feed organic acquisition (dogfooded keywords).

## 6. Multi-tenant scoping in IA

Everything after auth is scoped to the active **Workspace** (personal or team) within an
**Organization**. Workspace switcher changes the data context; URLs stay stable (context in session,
not URL) except shareable trend/entity pages which are global read models.

## 7. Responsive behavior

Left nav collapses to icon-rail (tablet) → drawer (mobile). Trend Detail scorecard + signals stack
vertically on mobile. Tables become card lists < md. Command palette is the primary mobile nav aid.

## 8. Review checklist

- [x] Nav avoids sprawl (tracking surfaces grouped under Research in R2).
- [x] URLs are shareable, SEO-friendly, and REST-aligned with the API.
- [x] Workspace/org scoping defined without leaking tenant data into shareable URLs.
- [x] Search (palette + semantic/keyword) and taxonomy support the discovery flows.
- [x] Responsive collapse defined for every primary surface.
