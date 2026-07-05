---
"@aioi/billing": minor
"@aioi/database": minor
"@aioi/api": minor
"@aioi/web": minor
---

Billing & entitlements (B-020): new `@aioi/billing` (plans + entitlements + `PlanLimitError`),
`getPlan`/`setPlan`/`getEntitlements` on Subscription (org-scoped RLS), `createWatchlist` enforces the
plan's watchlist limit, a `billing` tRPC router (plan/setPlan), and a `/billing` page. Stripe
checkout/webhooks follow.
