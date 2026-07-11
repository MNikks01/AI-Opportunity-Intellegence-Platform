/**
 * Entity momentum alerts (M15-A B-032). Fires an in-app notification when a **watched** supply-side
 * entity (model / MCP server / repo) is accelerating. Reuses the existing watchlist + alert + Notification
 * primitives — an `ENTITY_MOMENTUM` alert on a watchlist that has `ENTITY` items. Called from the
 * pipeline after entity snapshots are recorded. Per-org RLS-scoped; de-duped so it doesn't re-notify
 * every run.
 */
import { alertTriggerSchema, type AlertTrigger } from "@aioi/validation";
import { prisma } from "./client";
import { withOrgContext } from "./rls";
import { listActiveOrgIds } from "./repositories";
import { getEntityMomentumMap, TRACKED_ENTITY_TYPES } from "./entity-momentum";

/** Pure: does a trigger fire for an entity's momentum delta? Unit-testable. */
export function entityMomentumMatches(trigger: AlertTrigger, delta: number): boolean {
  return trigger.type === "ENTITY_MOMENTUM" && delta >= trigger.minDelta;
}

interface WatchedMomentum {
  delta: number;
  name: string;
}

/** Evaluate one org's ENTITY_MOMENTUM alerts against the accelerating-entity map. RLS-scoped. */
function evaluateEntityAlertsForOrg(orgId: string, accelerating: Map<string, WatchedMomentum>) {
  return withOrgContext(orgId, async (tx) => {
    const alerts = await tx.alert.findMany({
      where: { enabled: true, watchlist: { items: { some: { targetType: "ENTITY" } } } },
      include: {
        watchlist: {
          select: {
            name: true,
            items: { where: { targetType: "ENTITY" }, select: { targetId: true } },
          },
        },
      },
    });

    const created = [];
    for (const alert of alerts) {
      const parsed = alertTriggerSchema.safeParse(alert.trigger);
      if (!parsed.success || parsed.data.type !== "ENTITY_MOMENTUM") continue;
      for (const { targetId } of alert.watchlist.items) {
        const m = accelerating.get(targetId);
        if (!m || !entityMomentumMatches(parsed.data, m.delta)) continue;
        // De-dupe: one unread notification per (alert, entity) until the user reads it.
        const existing = await tx.notification.findFirst({
          where: { alertId: alert.id, targetId, targetType: "ENTITY", readAt: null },
          select: { id: true },
        });
        if (existing) continue;
        created.push(
          await tx.notification.create({
            data: {
              organizationId: orgId,
              alertId: alert.id,
              title: `${alert.watchlist.name}: ${m.name} is accelerating`,
              body: `${m.name} gained +${m.delta} signal${m.delta === 1 ? "" : "s"} — momentum accelerating.`,
              targetType: "ENTITY",
              targetId,
            },
          }),
        );
      }
    }
    return created;
  });
}

/**
 * Fan-out: compute momentum for every tracked entity, then notify each org whose watched entities are
 * accelerating. Iterates active orgs (each RLS-scoped) rather than a SECURITY DEFINER function — fine at
 * this scale. No-op when nothing is accelerating.
 */
export async function evaluateEntityAlertsAllOrgs(): Promise<{
  orgs: number;
  notifications: number;
}> {
  const entities = await prisma.entity.findMany({
    where: { type: { in: TRACKED_ENTITY_TYPES } },
    select: { id: true, name: true },
  });
  if (entities.length === 0) return { orgs: 0, notifications: 0 };
  const momentum = await getEntityMomentumMap(entities.map((e) => e.id));
  const accelerating = new Map<string, WatchedMomentum>();
  for (const e of entities) {
    const m = momentum.get(e.id);
    if (m && m.state === "accelerating" && m.delta > 0) {
      accelerating.set(e.id, { delta: m.delta, name: e.name });
    }
  }
  if (accelerating.size === 0) return { orgs: 0, notifications: 0 };

  const orgIds = await listActiveOrgIds();
  let notifications = 0;
  for (const org of orgIds) {
    const fired = await evaluateEntityAlertsForOrg(org, accelerating);
    notifications += fired.length;
  }
  return { orgs: orgIds.length, notifications };
}
