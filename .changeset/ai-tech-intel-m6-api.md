---
"@aioi/web": minor
"@aioi/database": minor
"@aioi/validation": minor
---

AI & Tech Intelligence vertical — M6 (public API + filters). New `/api/v1` read endpoints on the existing
envelope/auth/rate-limit stack: `GET /news` (feed with `q` hybrid search, region/category/minOpportunity/
sinceDays filters, sort, limit), `GET /news/{id}` (full analysis payload), `GET /categories` (taxonomy),
and `GET /models` (open-source model tracker). Backed by `listNews` / `getNewsItem` / `listModelCards`
in @aioi/database, and one shared `newsFilterSchema` (@aioi/validation) that validates the REST query
params (coerced) and is reusable by tRPC + the web filter form. Design: AI_TECH_INTELLIGENCE_MODULE.md;
ADR-0009.
