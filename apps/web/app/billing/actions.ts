"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { setPlan, getSubscription } from "@aioi/database";
import { getDevOrg } from "../lib/dev-org";
import { getSiteUrl } from "../lib/site";
import { getBillingProvider, stripeConfigured, getStripe, createPortalUrl } from "../lib/billing";

/** Start an upgrade. With Stripe configured, redirect to Checkout; otherwise apply Pro directly (dev). */
export async function startCheckoutAction(): Promise<void> {
  const { organizationId } = await getDevOrg();

  if (!stripeConfigured()) {
    await setPlan(organizationId, "PRO");
    revalidatePath("/billing");
    redirect("/billing?checkout=stub");
  }

  const site = getSiteUrl();
  const { url } = await getBillingProvider().createCheckoutSession({
    orgId: organizationId,
    plan: "PRO",
    successUrl: `${site}/billing`,
    cancelUrl: `${site}/billing`,
  });
  redirect(url);
}

/** Manage an active subscription: open the Stripe Billing Portal, or fall through to /billing. */
export async function openPortalAction(): Promise<void> {
  const { organizationId } = await getDevOrg();
  const sub = await getSubscription(organizationId);
  if (sub?.stripeCustomerId) {
    const url = await createPortalUrl(sub.stripeCustomerId);
    if (url) redirect(url);
  }
  redirect("/billing");
}

/** Cancel/downgrade. With Stripe, cancel at period end (plan flips on the webhook); else set FREE now. */
export async function cancelSubscriptionAction(): Promise<void> {
  const { organizationId } = await getDevOrg();

  if (stripeConfigured()) {
    const sub = await getSubscription(organizationId);
    if (sub?.stripeSubscriptionId) {
      await getStripe().subscriptions.update(sub.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
      redirect("/billing?checkout=cancelling");
    }
  }

  await setPlan(organizationId, "FREE");
  revalidatePath("/billing");
  redirect("/billing");
}
