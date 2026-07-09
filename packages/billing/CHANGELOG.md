# @aioi/billing

## 0.3.0

### Minor Changes

- 30ddabc: Plan-aware API quota: the daily API rate limit now comes from the org plan's entitlements (Free 1,000/day,
  Pro 50,000/day) instead of a constant. New apiDailyQuota entitlement; /team shows the plan + quota.

## 0.2.0

### Minor Changes

- eab0a4f: Stripe payments (B-020 cont.): a `BillingProvider` seam (Stub + Stripe checkout sessions),
  `billing.checkout` returning a session URL, and a signature-verified `POST /webhooks/stripe` that syncs
  `customer.subscription.*` events to `setPlan`. Inert without Stripe keys (Stub fallback).

## 0.1.0

### Minor Changes

- 5488c28: Billing & entitlements (B-020): new `@aioi/billing` (plans + entitlements + `PlanLimitError`),
  `getPlan`/`setPlan`/`getEntitlements` on Subscription (org-scoped RLS), `createWatchlist` enforces the
  plan's watchlist limit, a `billing` tRPC router (plan/setPlan), and a `/billing` page. Stripe
  checkout/webhooks follow.
