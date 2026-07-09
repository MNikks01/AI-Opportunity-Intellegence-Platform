"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isPaidPlan, type PaidPlan } from "@aioi/billing";
import { setPlan, getSubscription } from "@aioi/database";
import { getDevOrg } from "../lib/dev-org";
import { getSiteUrl } from "../lib/site";
import {
  getBillingProvider,
  stripeConfigured,
  planCheckoutAvailable,
  getStripe,
  createPortalUrl,
} from "../lib/billing";

/** Start an upgrade to a paid plan. With Stripe configured, redirect to Checkout; else apply directly. */
export async function startCheckoutAction(formData: FormData): Promise<void> {
  const { organizationId } = await getDevOrg();
  const raw = String(formData.get("plan") ?? "PRO");
  const plan: PaidPlan = isPaidPlan(raw) ? raw : "PRO";

  if (!planCheckoutAvailable(plan)) {
    // No Stripe price for this plan (dev/preview, or Team price unset): apply directly so it's testable.
    await setPlan(organizationId, plan);
    revalidatePath("/billing");
    redirect("/billing?checkout=stub");
  }

  const site = getSiteUrl();
  const { url } = await getBillingProvider().createCheckoutSession({
    orgId: organizationId,
    plan,
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
