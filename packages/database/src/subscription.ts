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
