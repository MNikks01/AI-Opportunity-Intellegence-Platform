# ADR-0004 — Billing & entitlements architecture

- **Status:** Accepted
- **Date:** 2026-07-09
- **Deciders:** Architect, Backend Engineer, Product
- **Context source:** B-020 (Billing Free/Pro via Stripe + entitlements), the `product-strategy-usp`
  monetization mapping, [ADR-0001](ADR-0001-core-stack.md), [ADR-0003](ADR-0003-row-level-security.md)

## Context

The product needs paid tiers (Free / Pro / Team) that gate real capability, sell via Stripe, and stay
verifiable in CI with no Stripe account. We had to decide where "what a plan grants" lives, where
limits are enforced, how a Stripe subscription maps back to our plan, and how to keep the whole flow
testable offline.

## Decision

### D1 — Entitlements are the single source of truth, in `@aioi/billing`

A `Plan` (`FREE | PRO | TEAM`) maps to an `Entitlements` record (`maxWatchlists`, `maxAlerts`,
`maxSeats`, `semanticSearch`, `dailyBrief`, `apiDailyQuota`). Every surface — the pricing page, the
billing page, the API rate limiter, and the enforcement checks — reads these same values via
`entitlementsFor(plan)`. Display prices (`PLAN_PRICING`) and the `BillingInterval` (monthly/annual,
annual = 10× monthly) live here too. No number is hard-coded at a call site.

### D2 — Enforce at the write paths, not at the edge

Limits are enforced inside the data layer where the resource is created —
`createWatchlist` / `createAlert` / `inviteMember` — which throw a typed `PlanLimitError`. The web
actions catch it and redirect to an inline upgrade prompt; tRPC maps it to `FORBIDDEN`. This means a
new caller (REST, tRPC, a script) can't bypass a limit by forgetting a check. `setPlan` snapshots the
entitlements onto the `Subscription` row so a later entitlements change doesn't silently alter
existing subscribers until re-synced.

### D3 — The webhook is the source of truth; the plan travels in Stripe metadata

Plan changes are applied by a **signature-verified webhook**, not by the checkout redirect. We set
`{ orgId, plan }` in the Checkout Session's `metadata` and `subscription_data.metadata`, so
`syncFromCheckoutSession` / `syncFromSubscription` (pure, unit-tested helpers) resolve the org and
plan **without a price→plan lookup table**. `applyStripeSubscription` persists the plan +
entitlements + Stripe ids and writes an audit entry. Cancellation maps to `FREE`.

### D4 — A `BillingProvider` seam with a deterministic Stub

`@aioi/billing` owns the `BillingProvider` interface and a `StubBillingProvider`; the Stripe SDK is
confined to the app (`apps/web/app/lib/billing.ts`). `getBillingProvider()` returns the real provider
only when `STRIPE_SECRET_KEY` + the price id are set, else the Stub — whose success URL self-applies
the plan. The entire upgrade → entitlement → enforcement path is therefore exercisable offline, and
CI stays green with no Stripe keys.

## Consequences

- **Positive:** one place defines plans/prices/limits; enforcement can't be bypassed per-surface; the
  webhook needs no price→plan table (add a plan by adding an entitlement + a price id); the flow is
  fully testable offline (pure event→plan helpers + Stub). Adding annual billing was a price-id +
  interval change with **no** change to entitlements or the webhook.
- **Negative / required next steps:** display prices in `@aioi/billing` must be kept in sync with the
  actual Stripe prices (operator responsibility); the standalone Fastify API has its own older,
  monthly-Pro checkout path that is not yet interval-aware; going live requires the operator to set
  `STRIPE_SECRET_KEY`, the `STRIPE_PRICE_*` ids, and `STRIPE_WEBHOOK_SECRET`.

## Alternatives considered

- **Entitlements in the database per org** — rejected as the source of truth; the plan→entitlement
  map is code (versioned, testable). The `Subscription` row snapshots the granted entitlements, but
  the mapping lives in `@aioi/billing`.
- **Price→plan lookup in the webhook** — rejected; carrying the plan in subscription metadata is
  simpler and removes a table that must be kept in sync with Stripe.
- **Enforce limits only in the web UI** — rejected; a second API surface (tRPC/REST/scripts) would
  silently bypass it. Enforcement lives in the data layer.

## Follow-ons

Alert email delivery (needs `Notification.emailedAt` + a delivery job), making the Fastify API
checkout interval-aware, and a **Business** tier + SSO for the enterprise motion.
