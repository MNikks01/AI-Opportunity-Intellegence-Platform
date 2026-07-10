# @aioi/billing

## 0.4.0

### Minor Changes

- a4f5de6: Annual billing option. Paid plans can now be billed annually at 10× the monthly rate (two months
  free): shared PLAN_PRICING + monthlyEquivalent in @aioi/billing, a monthly/annual toggle on the
  pricing and billing pages, and interval-aware Stripe checkout (STRIPE_PRICE_*_ANNUAL price ids;
  interval threaded through CheckoutInput). Entitlements are unchanged by interval.
- 97f8bf4: Business tier — a 4th plan (100 seats, 500k/day API, $299/mo) rounding out the ladder, following the
  ADR-0004 entitlements pattern. New PLAN_ORDER / planRank; the billing page offers an upgrade to every
  plan above the current one; pricing renders four tiers. SSO/enterprise controls are a follow-on.
- 4011ff2: Stripe checkout & webhook for self-serve upgrades. The `/billing` "Upgrade to Pro" button opens
  Stripe Checkout (or applies Pro directly in test mode); a signature-verified webhook is the source
  of truth for plan changes, mapping subscription events → plan via pure, unit-tested helpers and
  persisting the Stripe ids. Manage/cancel via the Stripe Billing Portal. Falls back to the offline
  Stub when STRIPE_SECRET_KEY / STRIPE_PRICE_PRO are unset.
- 7edad2e: Team tier + seat enforcement. New TEAM plan (25 seats, 200k/day API) alongside Free/Pro; every plan
  now has a maxSeats entitlement (Free 1, Pro 3, Team 25) enforced at inviteMember (throws
  PlanLimitError). Stripe checkout is plan-aware (Pro/Team prices; plan carried in metadata so the
  webhook needs no price→plan table). Pricing page shows 3 tiers; billing offers per-plan upgrades;
  the team page shows seat usage and blocks invites when full.

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
