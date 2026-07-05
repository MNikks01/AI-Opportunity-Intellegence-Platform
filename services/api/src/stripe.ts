/**
 * Stripe integration (B-020): the concrete BillingProvider (checkout sessions) + the webhook handler
 * that syncs a subscription's plan back to us. Inert without STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET
 * (falls back to the Stub), so dev/CI stay green.
 */
import Stripe from "stripe";
import { setPlan } from "@aioi/database";
import {
  StubBillingProvider,
  planForStripeSubscription,
  type BillingProvider,
  type CheckoutInput,
  type CheckoutSession,
} from "@aioi/billing";

class StripeBillingProvider implements BillingProvider {
  readonly name = "stripe";
  constructor(
    private readonly stripe: Stripe,
    private readonly pricePro: string,
  ) {}

  async createCheckoutSession(input: CheckoutInput): Promise<CheckoutSession> {
    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: this.pricePro, quantity: 1 }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      client_reference_id: input.orgId,
      subscription_data: { metadata: { orgId: input.orgId } },
    });
    if (!session.url) throw new Error("Stripe returned no checkout URL");
    return { url: session.url };
  }
}

/** Stripe when a secret key + PRO price are configured, else the deterministic Stub. */
export function getBillingProvider(): BillingProvider {
  const key = process.env.STRIPE_SECRET_KEY;
  const price = process.env.STRIPE_PRICE_PRO;
  if (key && price) return new StripeBillingProvider(new Stripe(key), price);
  return new StubBillingProvider();
}

interface StripeSubscriptionEvent {
  type: string;
  data: { object: { status?: string; metadata?: { orgId?: string } } };
}

/** Sync a subscription event to our plan. Reads orgId from subscription metadata (set at checkout). */
export async function handleStripeEvent(evt: StripeSubscriptionEvent): Promise<void> {
  if (!evt.type.startsWith("customer.subscription.")) return;
  const orgId = evt.data.object.metadata?.orgId;
  if (!orgId) return;
  await setPlan(orgId, planForStripeSubscription(evt.type, evt.data.object.status));
}

/** Verify + parse a Stripe webhook payload. Throws on bad signature. */
export function verifyStripeEvent(rawBody: string, signature: string): Stripe.Event {
  const key = process.env.STRIPE_SECRET_KEY;
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !secret) throw new Error("stripe not configured");
  return new Stripe(key).webhooks.constructEvent(rawBody, signature, secret);
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}
