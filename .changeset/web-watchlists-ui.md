---
"@aioi/web": minor
---

Add the Watchlists UI: `/watchlists` (list + create + delete) and `/watchlists/[id]` (items +
add/remove) as RSC pages with Server Actions over the RLS-enforced repository, plus a nav link. A
request-cached dev-org resolver stands in for a session until Clerk is wired (B-016).
