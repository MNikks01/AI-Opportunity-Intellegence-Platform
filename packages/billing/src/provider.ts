/**
 * Billing provider seam. Stripe is confined to a `BillingProvider` implementation (in the API, where
 * the SDK lives); this package owns the interface, a deterministic Stub for dev/test, and the pure
 * mapping from a Stripe subscription event to our plan.
 */
import type { Plan } from "./index";

export interface CheckoutSession {
  url: string;
}

export interface CheckoutInput {
  orgId: string;
  plan: Exclude<Plan, "FREE">;
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

/** Map a Stripe subscription webhook → our plan. Cancelled/expired/deleted → FREE; otherwise PRO. */
export function planForStripeSubscription(eventType: string, status?: string): Plan {
  if (eventType === "customer.subscription.deleted") return "FREE";
  if (status && ["canceled", "unpaid", "incomplete_expired"].includes(status)) return "FREE";
  return "PRO";
}
