---
"@aioi/database": minor
"@aioi/web": minor
---

Enforce plan entitlements at the write paths. `createAlert` now enforces `maxAlerts` (Free 10)
like `createWatchlist` already did for `maxWatchlists`, throwing `PlanLimitError`. Semantic search
on `/trends` is gated on the `semanticSearch` entitlement (Free falls back to keyword with an
upgrade prompt). Blocked creates redirect back with a friendly "upgrade" banner instead of erroring.
