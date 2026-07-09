/**
 * Subscription / plan persistence (B-020). One Subscription per org (unique). `getPlan` defaults to
 * FREE when no row exists. `setPlan` snapshots the plan's entitlements onto the row (so a later
 * entitlements change doesn't silently alter existing subscribers until re-synced). Org-scoped (RLS).
 */
import type { Prisma } from "@prisma/client";
import { entitlementsFor, type Entitlements } from "@aioi/billing";
import { withOrgContext } from "./rls";

export function getPlan(orgId: string): Promise<string> {
  return withOrgContext(orgId, async (tx) => {
    const sub = await tx.subscription.findFirst();
    return sub?.plan ?? "FREE";
  });
}

export function getEntitlements(orgId: string): Promise<Entitlements> {
  return getPlan(orgId).then(entitlementsFor);
}

export function setPlan(orgId: string, plan: string) {
  const entitlements = entitlementsFor(plan) as unknown as Prisma.InputJsonValue;
  return withOrgContext(orgId, (tx) =>
    tx.subscription.upsert({
      where: { organizationId: orgId },
      create: { organizationId: orgId, plan, status: "active", entitlements },
      update: { plan, status: "active", entitlements },
    }),
  );
}

/** The raw subscription row for an org (Stripe ids, status, period end), or `null` if none. */
export function getSubscription(orgId: string) {
  return withOrgContext(orgId, (tx) => tx.subscription.findFirst());
}

export interface StripeSync {
  plan: string;
  status: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: Date;
}

/**
 * Apply a Stripe webhook to the org's subscription: snapshot the plan's entitlements, persist the
 * Stripe identifiers (only overwriting when the event carries them), and write an audit entry. This
 * is the source of truth for plan changes in production — the checkout redirect only *starts* it.
 */
export function applyStripeSubscription(orgId: string, sync: StripeSync) {
  const entitlements = entitlementsFor(sync.plan) as unknown as Prisma.InputJsonValue;
  const ids = {
    ...(sync.stripeCustomerId ? { stripeCustomerId: sync.stripeCustomerId } : {}),
    ...(sync.stripeSubscriptionId ? { stripeSubscriptionId: sync.stripeSubscriptionId } : {}),
    ...(sync.currentPeriodEnd ? { currentPeriodEnd: sync.currentPeriodEnd } : {}),
  };
  return withOrgContext(orgId, async (tx) => {
    await tx.subscription.upsert({
      where: { organizationId: orgId },
      create: {
        organizationId: orgId,
        plan: sync.plan,
        status: sync.status,
        entitlements,
        ...ids,
      },
      update: { plan: sync.plan, status: sync.status, entitlements, ...ids },
    });
    await tx.auditLog.create({
      data: {
        organizationId: orgId,
        actorUserId: null,
        action: "subscription.stripe_sync",
        targetType: "subscription",
        targetId: sync.stripeSubscriptionId ?? null,
        metadata: { plan: sync.plan, status: sync.status } as Prisma.InputJsonValue,
      },
    });
  });
}
