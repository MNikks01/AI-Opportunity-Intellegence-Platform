/**
 * Alerts (B-017): CRUD + the matching engine. Alerts hang off watchlists; every op is org-scoped via
 * `withOrgContext` and gated by RLS (Alert = EXISTS-through-parent). When a watched trend matches an
 * alert's trigger, the engine writes an in-app Notification. External channels (email/slack) are a
 * follow-up — they read unsent notifications.
 */
import type { Prisma } from "@prisma/client";
import { alertTriggerSchema, type AlertTrigger, type CreateAlertInput } from "@aioi/validation";
import { withOrgContext } from "./rls";
import { NotFoundError } from "./watchlists";

/** A trend + its scores by dimension (lowercase keys, matching the read model). */
export interface TrendEvent {
  trendId: string;
  title?: string;
  scores: Record<string, number>;
}

/** Pure trigger evaluation — unit-testable without a database. */
export function alertMatches(trigger: AlertTrigger, scores: Record<string, number>): boolean {
  switch (trigger.type) {
    case "NEW_TREND":
      return true;
    case "SCORE_CROSSES":
      return (scores[trigger.dimension] ?? Number.NEGATIVE_INFINITY) >= trigger.gte;
  }
}

function triggerLabel(trigger: AlertTrigger): string {
  return trigger.type === "SCORE_CROSSES"
    ? `${trigger.dimension} ≥ ${trigger.gte}`
    : "new watched trend";
}

async function requireWatchlist(tx: Prisma.TransactionClient, id: string) {
  const wl = await tx.watchlist.findFirst({ where: { id } });
  if (!wl) throw new NotFoundError("watchlist");
  return wl;
}

export function createAlert(orgId: string, input: CreateAlertInput) {
  return withOrgContext(orgId, async (tx) => {
    await requireWatchlist(tx, input.watchlistId);
    return tx.alert.create({
      data: {
        watchlistId: input.watchlistId,
        trigger: input.trigger as Prisma.InputJsonValue,
        channel: input.channel,
        cadence: input.cadence,
      },
    });
  });
}

export function listAlerts(orgId: string, watchlistId: string) {
  return withOrgContext(orgId, async (tx) => {
    await requireWatchlist(tx, watchlistId);
    return tx.alert.findMany({ where: { watchlistId }, orderBy: { createdAt: "desc" } });
  });
}

export function setAlertEnabled(orgId: string, id: string, enabled: boolean) {
  return withOrgContext(orgId, async (tx) => {
    const alert = await tx.alert.findFirst({ where: { id } });
    if (!alert) throw new NotFoundError("alert");
    return tx.alert.update({ where: { id }, data: { enabled } });
  });
}

export function deleteAlert(orgId: string, id: string) {
  return withOrgContext(orgId, async (tx) => {
    const alert = await tx.alert.findFirst({ where: { id } });
    if (!alert) throw new NotFoundError("alert");
    await tx.alert.delete({ where: { id } });
    return { id };
  });
}

/**
 * Evaluate a trend against one org's enabled alerts and write in-app notifications for matches.
 * Returns the created notifications. A scheduler/pipeline calls this per active org (RLS-safe).
 */
export function evaluateTrendForOrg(orgId: string, event: TrendEvent) {
  return withOrgContext(orgId, async (tx) => {
    const alerts = await tx.alert.findMany({
      where: {
        enabled: true,
        watchlist: { items: { some: { targetType: "TREND", targetId: event.trendId } } },
      },
      include: { watchlist: { select: { name: true } } },
    });

    const created = [];
    for (const alert of alerts) {
      const parsed = alertTriggerSchema.safeParse(alert.trigger);
      if (!parsed.success || !alertMatches(parsed.data, event.scores)) continue;
      created.push(
        await tx.notification.create({
          data: {
            organizationId: orgId,
            alertId: alert.id,
            title: `${alert.watchlist.name}: ${triggerLabel(parsed.data)}`,
            body: event.title
              ? `Trend "${event.title}" matched your alert.`
              : "A watched trend matched.",
            targetType: "TREND",
            targetId: event.trendId,
          },
        }),
      );
    }
    return created;
  });
}
