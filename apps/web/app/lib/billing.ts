import "server-only";
import Stripe from "stripe";
import {
  StubBillingProvider,
  type BillingProvider,
  type CheckoutInput,
  type CheckoutSession,
  type PaidPlan,
} from "@aioi/billing";
import { getSiteUrl } from "./site";

/**
 * Stripe seam for the web app. When the Stripe env is present we use a real `StripeBillingProvider`;
 * otherwise we fall back to the deterministic Stub so the whole upgrade flow stays exercisable
 * offline (the Stub's success URL self-applies the plan — see the billing page). Keys are read lazily
 * so importing this module never throws in an unconfigured environment.
 */
const secret = process.env.STRIPE_SECRET_KEY;
const PRICES: Record<PaidPlan, string | undefined> = {
  PRO: process.env.STRIPE_PRICE_PRO,
  TEAM: process.env.STRIPE_PRICE_TEAM,
};

/** True when a secret key + the Pro price id are configured — real checkout is available. */
export function stripeConfigured(): boolean {
  return Boolean(secret && PRICES.PRO);
}

/** True when the given paid plan has a Stripe price id (Team is optional). */
export function planCheckoutAvailable(plan: PaidPlan): boolean {
  return Boolean(secret && PRICES[plan]);
}

let client: Stripe | null = null;
export function getStripe(): Stripe {
  if (!secret) throw new Error("STRIPE_SECRET_KEY is not set");
  if (!client) client = new Stripe(secret, { apiVersion: "2025-02-24.acacia" });
  return client;
}

class StripeBillingProvider implements BillingProvider {
  readonly name = "stripe";
  async createCheckoutSession(input: CheckoutInput): Promise<CheckoutSession> {
    const price = PRICES[input.plan];
    if (!price) throw new Error(`No Stripe price configured for plan ${input.plan}`);
    // Org + plan travel with the session and onto the subscription, so the webhook can attribute it
    // and set the right plan — no price→plan table needed.
    const metadata = { orgId: input.orgId, plan: input.plan };
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      client_reference_id: input.orgId,
      metadata,
      subscription_data: { metadata },
      success_url: `${input.successUrl}?checkout=success`,
      cancel_url: `${input.cancelUrl}?checkout=cancelled`,
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return { url: session.url };
  }
}

export function getBillingProvider(): BillingProvider {
  return stripeConfigured() ? new StripeBillingProvider() : new StubBillingProvider();
}

/** A Stripe Billing Portal URL for self-service management (update card, cancel), or `null` if unset. */
export async function createPortalUrl(stripeCustomerId: string): Promise<string | null> {
  if (!stripeConfigured()) return null;
  const portal = await getStripe().billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${getSiteUrl()}/billing`,
  });
  return portal.url;
}
