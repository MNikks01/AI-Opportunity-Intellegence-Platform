/**
 * Billing provider seam. Stripe is confined to a `BillingProvider` implementation (in the API, where
 * the SDK lives); this package owns the interface, a deterministic Stub for dev/test, and the pure
 * mapping from a Stripe subscription event to our plan.
 */
import { isPaidPlan, type Plan, type PaidPlan } from "./index";

export interface CheckoutSession {
  url: string;
}

export interface CheckoutInput {
  orgId: string;
  plan: PaidPlan;
  successUrl: string;
  cancelUrl: string;
}

export interface BillingProvider {
  readonly name: string;
  createCheckoutSession(input: CheckoutInput): Promise<CheckoutSession>;
}

/** No real Stripe — returns a placeholder URL echoing the intent, so the flow is exercisable offline. */
export class StubBillingProvider implements BillingProvider {
  readonly name = "stub";
  createCheckoutSession(input: CheckoutInput): Promise<CheckoutSession> {
    const url = `${input.successUrl}?stub_checkout=1&plan=${input.plan}&org=${input.orgId}`;
    return Promise.resolve({ url });
  }
}

/**
 * Map a Stripe subscription webhook → our plan. Cancelled/expired/deleted → FREE; otherwise the
 * `activePlan` the caller resolved from the subscription (we carry it in Stripe metadata at checkout,
 * so no price→plan table is needed). Defaults to PRO for back-compat.
 */
export function planForStripeSubscription(
  eventType: string,
  status?: string,
  activePlan: PaidPlan = "PRO",
): Plan {
  if (eventType === "customer.subscription.deleted") return "FREE";
  if (status && ["canceled", "unpaid", "incomplete_expired"].includes(status)) return "FREE";
  return activePlan;
}

/** The paid plan carried in Stripe metadata (set at checkout), defaulting to PRO if absent/invalid. */
function planFromMetadata(metadata?: Record<string, string> | null): PaidPlan {
  const p = metadata?.plan;
  return p && isPaidPlan(p) ? p : "PRO";
}

/**
 * What a webhook resolves to: which org to update and to what. `null` means "not for us / can't
 * attribute" (no org in metadata) — the route acknowledges it (200) without touching any plan.
 */
export interface PlanSync {
  orgId: string;
  plan: Plan;
  status: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: Date;
}

// Minimal structural shapes of the Stripe objects we read — keeps this package free of the SDK.
export interface StripeCheckoutSessionLike {
  client_reference_id?: string | null;
  customer?: string | null;
  subscription?: string | null;
  metadata?: Record<string, string> | null;
}
export interface StripeSubscriptionLike {
  id?: string;
  status?: string;
  customer?: string | null;
  current_period_end?: number | null;
  metadata?: Record<string, string> | null;
}

const asId = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);

/** A completed Checkout Session means a fresh paid subscription. Plan + org travel in metadata. */
export function syncFromCheckoutSession(s: StripeCheckoutSessionLike): PlanSync | null {
  const orgId = s.client_reference_id ?? s.metadata?.orgId;
  if (!orgId) return null;
  return {
    orgId,
    plan: planFromMetadata(s.metadata),
    status: "active",
    stripeCustomerId: asId(s.customer),
    stripeSubscriptionId: asId(s.subscription),
  };
}

/** A subscription update/deletion re-derives the plan from its status. Org + plan in `metadata`. */
export function syncFromSubscription(
  eventType: string,
  sub: StripeSubscriptionLike,
): PlanSync | null {
  const orgId = sub.metadata?.orgId;
  if (!orgId) return null;
  return {
    orgId,
    plan: planForStripeSubscription(eventType, sub.status, planFromMetadata(sub.metadata)),
    status: sub.status ?? "active",
    stripeCustomerId: asId(sub.customer),
    stripeSubscriptionId: asId(sub.id),
    currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : undefined,
  };
}
