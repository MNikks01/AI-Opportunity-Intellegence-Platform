/**
 * Alerts (B-017): CRUD + the matching engine. Alerts hang off watchlists; every op is org-scoped via
 * `withOrgContext` and gated by RLS (Alert = EXISTS-through-parent). When a watched trend matches an
 * alert's trigger, the engine writes an in-app Notification. External channels (email/slack) are a
 * follow-up — they read unsent notifications.
 */
import type { Prisma } from "@prisma/client";
import { entitlementsFor, withinLimit, PlanLimitError } from "@aioi/billing";
import { alertTriggerSchema, type AlertTrigger, type CreateAlertInput } from "@aioi/validation";
import { prisma } from "./client";
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

    // Enforce the plan's alert limit (B-020). Alerts are org-scoped via RLS (EXISTS-through-parent),
    // so this count is the org's total across all watchlists. No subscription row → FREE.
    const sub = await tx.subscription.findFirst();
    const limit = entitlementsFor(sub?.plan ?? "FREE").maxAlerts;
    const count = await tx.alert.count();
    if (!withinLimit(limit, count)) throw new PlanLimitError("alerts");

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

/** Number of alerts across the org's watchlists (org-scoped via RLS) — for usage-vs-limit display. */
export function countAlerts(orgId: string): Promise<number> {
  return withOrgContext(orgId, (tx) => tx.alert.count());
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

/**
 * Fan-out entry point for the scoring pipeline: evaluate a scored trend against EVERY org that watches
 * it and write notifications. Uses the SECURITY DEFINER `app_orgs_watching_trend` for cross-tenant
 * discovery (the runtime role can't read other orgs' watchlists), then per-org `evaluateTrendForOrg`
 * (RLS-scoped). Safe no-op when nobody watches the trend.
 */
export async function evaluateTrendAllOrgs(
  event: TrendEvent,
): Promise<{ orgs: number; notifications: number }> {
  const rows = await prisma.$queryRaw<Array<{ org: string }>>`
    SELECT app_orgs_watching_trend(${event.trendId}) AS org`;
  let notifications = 0;
  for (const { org } of rows) {
    const fired = await evaluateTrendForOrg(org, event);
    notifications += fired.length;
  }
  return { orgs: rows.length, notifications };
}
