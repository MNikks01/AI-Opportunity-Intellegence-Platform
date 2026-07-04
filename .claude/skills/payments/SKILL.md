---
name: payments
description: >-
  Deep guidance for billing and monetization in the AI Opportunity Intelligence Platform — Stripe
  subscriptions (Free/Pro/Team/Business) + metered API usage + entitlements. Use when building
  checkout, the billing portal, webhooks, plan gating, usage metering, or reviewing anything that
  touches money. Correctness + security here are non-negotiable: entitlements come from Stripe, never
  the client.
---

# Payments & Billing

Monetization is Free → **Pro $29** → **Team $99** → **Business/API** (see PRICING_MODEL). Stripe is the
source of truth for subscription state and entitlements; the app **reconciles from webhooks**, never
trusts the client. Public API usage is **metered** per key → Stripe usage billing. The two hard rules:
**verify every webhook** and **derive entitlements server-side**. See [PRD §11](../../../docs/01-product/PRODUCT_REQUIREMENTS_DOCUMENT.md),
skills `auth`, `security`, `backend`.

> Note: entering card/bank details is out of scope for automation — Stripe Checkout/Elements collect
> payment data; we never handle raw card numbers.

## When to apply

- Building checkout, upgrade/downgrade, the billing portal, or plan-gating a feature.
- Handling Stripe webhooks, syncing subscription state, or metering API usage.
- Reviewing any code that gates features by plan or touches money.

## Rule categories by priority

| Priority | Category | Why |
|---|---|---|
| **CRITICAL** | Webhook verification | Unverified webhooks let anyone grant themselves a plan. |
| **CRITICAL** | Server-side entitlements | Client-claimed plan = trivial paywall bypass. |
| **CRITICAL** | Idempotent event handling | Stripe retries; double-processing corrupts state/credits. |
| **HIGH** | Accurate metering | Over/under-billing erodes trust + revenue. |
| **HIGH** | Reconciliation as source of truth | Local state must mirror Stripe, not diverge. |
| **MEDIUM** | Dunning & lifecycle | Failed payments, grace periods, cancellations. |
| **MEDIUM** | Tax/compliance & PCI scope | Keep PCI scope minimal; handle tax via Stripe. |

## Plan → entitlements (server-derived)

| Plan | Key entitlements (examples) |
|---|---|
| Free | daily brief, limited trends, 1 watchlist |
| Pro | full scores, unlimited watchlists, alerts, semantic search |
| Team | seats, shared workspaces, reports, integrations |
| Business/API | API quota + metering, SSO, white-label reports |

Store the current plan + a computed `entitlements` JSON on `Subscription`; gate features with
`hasEntitlement(ctx, "semantic_search")`, never by reading a client flag.

## Quick reference — the rules

### 1. Webhook verification (CRITICAL)
- Verify the signature with `STRIPE_WEBHOOK_SECRET` (`stripe.webhooks.constructEvent`) on the **raw**
  body before doing anything. Reject on mismatch. Keep the webhook route isolated + rate-limited.

### 2. Server-side entitlements (CRITICAL)
- Entitlements are derived from the Stripe subscription and stored on `Subscription`. Feature gates
  check server-side entitlements. The client may *display* the plan but never *grants* access.

### 3. Idempotent handling (CRITICAL)
- Dedupe by Stripe `event.id` (store processed ids). Handlers are idempotent — replays and out-of-order
  events must converge to the same state.

### 4. Metering (HIGH)
- Meter API calls per key (reportUsage / usage records). Meter reliably (queue the usage event) so a
  crash doesn't lose billable usage; dedupe to avoid double-count. Enforce quota + LLM cost caps.

### 5. Reconciliation (HIGH)
- On `customer.subscription.*` and `invoice.*` events, upsert local `Subscription` (plan, status,
  currentPeriodEnd, entitlements). Provide a re-sync path (fetch from Stripe) to self-heal drift.

### 6. Lifecycle & dunning (MEDIUM)
- Handle `invoice.payment_failed` → grace period + non-destructive banner + retry; downgrade only after
  grace. Cancellations set access end at period end. Use Stripe Billing Portal for self-serve.

### 7. Compliance (MEDIUM)
- Use Stripe Checkout/Elements (PCI scope minimal — never touch raw PAN). Stripe Tax for VAT/sales tax.
  Store only Stripe ids, not card data. RBAC: only Owner/Billing manage billing.

## Patterns — good vs bad

**Verified, idempotent webhook → reconcile:**
```ts
// ✅ GOOD — verify raw body, dedupe by event id, reconcile entitlements
const event = stripe.webhooks.constructEvent(req.rawBody, req.headers["stripe-signature"], env.STRIPE_WEBHOOK_SECRET);
if (await processedEvents.has(event.id)) return reply.code(200).send();   // idempotent replay
switch (event.type) {
  case "customer.subscription.updated":
  case "customer.subscription.created":
    await syncSubscription(event.data.object);   // upsert plan/status/entitlements from Stripe
    break;
}
await processedEvents.add(event.id);
```

**Server-side gate (no client trust):**
```ts
// ❌ BAD — trusts a client flag
if (req.body.isPro) return semanticSearch(q);

// ✅ GOOD — entitlement derived from Stripe-synced Subscription
if (!hasEntitlement(ctx, "semantic_search")) throw new TRPCError({ code: "FORBIDDEN", message: "Upgrade to Pro" });
return semanticSearch(ctx.orgId, q);
```

**Reliable metering:**
```ts
// ✅ GOOD — enqueue usage so a crash doesn't lose billable events; dedupe by request id
await usageQueue.add("meter", { apiKeyId, requestId, units: 1 }, { jobId: requestId });
```

## Step-by-step: add billing/gating

1. Model plans/prices in Stripe; map to `entitlements` in code.
2. Checkout via Stripe Checkout (redirect); Billing Portal for management. Never collect card data yourself.
3. Webhook route: verify signature (raw body), dedupe by `event.id`, reconcile `Subscription`.
4. Gate features with `hasEntitlement` (server). Meter API usage per key (queued, deduped).
5. Handle dunning (payment_failed → grace → downgrade) + cancellation at period end.
6. RBAC: restrict billing to Owner/Billing; audit changes.
7. Tests: webhook signature, idempotent replay, entitlement gate, metering accuracy, downgrade flow.
   CHANGELOG + changeset.

## Decision guide

| Need | Do | Don't |
|---|---|---|
| Know a user's plan | server entitlements from Stripe sync | trust client flag |
| Collect payment | Stripe Checkout/Elements | build your own card form |
| React to plan change | verified webhook → reconcile | poll / assume success |
| Bill API usage | metered usage records (queued) | count in-memory only |
| Failed payment | grace period + retry | immediate hard cutoff |

## Failure modes → fixes

| Symptom | Cause | Fix |
|---|---|---|
| Paywall bypassed | client-trusted entitlement | server-side gate from Stripe sync |
| Fake plan granted | unverified webhook | verify signature on raw body |
| Double credits / corrupt state | non-idempotent handler | dedupe by `event.id`; idempotent upsert |
| Under/over-billing | lost/duplicated usage events | queue + dedupe usage; reconcile |
| Local plan drifts from Stripe | missing reconciliation | sync on events + re-sync path |

## Pre-delivery checklist

- [ ] Webhook signature verified on the raw body; route isolated + rate-limited
- [ ] Events deduped by `event.id`; handlers idempotent
- [ ] Entitlements derived from Stripe + stored on `Subscription`; feature gates are server-side
- [ ] API usage metered per key, queued + deduped; quota + cost caps enforced
- [ ] Reconciliation on subscription/invoice events + a re-sync path
- [ ] Dunning (grace/retry/downgrade) + cancel-at-period-end handled
- [ ] No raw card data touched (Stripe Checkout/Elements); Stripe Tax; billing RBAC (Owner/Billing) + audit
- [ ] Tests: signature, replay, gate, metering, downgrade; CHANGELOG + changeset

## References
[PRD §11](../../../docs/01-product/PRODUCT_REQUIREMENTS_DOCUMENT.md) · [PRICING_MODEL](../../../docs/09-process/) ·
skills: `auth`, `security`, `backend`, `queues`, `analytics`.
