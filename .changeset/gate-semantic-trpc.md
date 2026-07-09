---
"@aioi/api": minor
---

Gate the tRPC `trends.semanticSearch` procedure on the plan entitlement. It is now a
`protectedProcedure` that requires `search:read` and a plan granting `semanticSearch` (Pro/Team),
returning FORBIDDEN otherwise — closing the last ungated semantic-search surface (the web /trends
flow was already gated).
