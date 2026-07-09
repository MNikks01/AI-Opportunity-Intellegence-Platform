import type Stripe from "stripe";
import {
  syncFromCheckoutSession,
  syncFromSubscription,
  type PlanSync,
  type StripeCheckoutSessionLike,
  type StripeSubscriptionLike,
} from "@aioi/billing";
import { applyStripeSubscription } from "@aioi/database";
import { getStripe, stripeConfigured } from "../../../lib/billing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Stripe webhook — the source of truth for plan changes. Verifies the signature, resolves the event
 * to a single org + plan (pure helpers in @aioi/billing), and applies it. Unrecognized or
 * unattributable events are acknowledged (200) without side effects so Stripe stops retrying.
 */
export async function POST(req: Request): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeConfigured() || !secret) {
    return Response.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "missing_signature" }, { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return Response.json({ error: "invalid_signature" }, { status: 400 });
  }

  let sync: PlanSync | null = null;
  switch (event.type) {
    case "checkout.session.completed":
      // The helpers read a minimal structural subset; Stripe's exact object is a superset.
      sync = syncFromCheckoutSession(event.data.object as unknown as StripeCheckoutSessionLike);
      break;
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      sync = syncFromSubscription(
        event.type,
        event.data.object as unknown as StripeSubscriptionLike,
      );
      break;
    default:
      return Response.json({ received: true, ignored: event.type });
  }

  if (!sync) return Response.json({ received: true, unattributed: true });
  await applyStripeSubscription(sync.orgId, sync);
  return Response.json({ received: true, org: sync.orgId, plan: sync.plan });
}
