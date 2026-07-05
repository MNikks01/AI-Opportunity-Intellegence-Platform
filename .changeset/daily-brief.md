---
"@aioi/database": minor
"@aioi/api": minor
"@aioi/web": minor
---

Daily Brief (B-018): `generateDailyBrief` aggregates top-opportunity trends + the org's
watchlist/unread-alert counts into a `Brief` (in-app delivered), with `listBriefs`/`getBrief` and open
tracking (`markBriefOpened`). Adds a `briefs` tRPC router and a `/briefs` list + detail UI. Org-scoped (RLS).
