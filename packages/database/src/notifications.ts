/**
 * In-app notification inbox (B-017). Org-scoped via `withOrgContext` (Notification has direct-org RLS).
 */
import { withOrgContext } from "./rls";
import { NotFoundError } from "./watchlists";

export function listNotifications(orgId: string, opts?: { unreadOnly?: boolean; limit?: number }) {
  return withOrgContext(orgId, (tx) =>
    tx.notification.findMany({
      where: opts?.unreadOnly ? { readAt: null } : undefined,
      orderBy: { createdAt: "desc" },
      take: opts?.limit ?? 50,
    }),
  );
}

export function unreadNotificationCount(orgId: string) {
  return withOrgContext(orgId, (tx) => tx.notification.count({ where: { readAt: null } }));
}

export function markNotificationRead(orgId: string, id: string) {
  return withOrgContext(orgId, async (tx) => {
    const n = await tx.notification.findFirst({ where: { id } });
    if (!n) throw new NotFoundError("notification");
    return tx.notification.update({ where: { id }, data: { readAt: new Date() } });
  });
}

export function markAllNotificationsRead(orgId: string) {
  return withOrgContext(orgId, async (tx) => {
    const res = await tx.notification.updateMany({
      where: { readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: res.count };
  });
}

/** A notification awaiting email delivery, with the fields an alert email needs. */
export interface PendingEmailNotification {
  id: string;
  title: string;
  body: string;
  targetType: string | null;
  targetId: string | null;
  createdAt: Date;
}

/**
 * Undelivered notifications for the org whose parent alert uses the EMAIL channel (B-017 follow-up).
 * Org-scoped (RLS). Notification has no Prisma relation to Alert, so we resolve the EMAIL alerts in a
 * second query and filter — cheap for the small batches a delivery run processes.
 */
export function listPendingEmailNotifications(
  orgId: string,
  limit = 100,
): Promise<PendingEmailNotification[]> {
  return withOrgContext(orgId, async (tx) => {
    const notifs = await tx.notification.findMany({
      where: { emailedAt: null, alertId: { not: null } },
      orderBy: { createdAt: "asc" },
      take: limit,
      select: {
        id: true,
        title: true,
        body: true,
        targetType: true,
        targetId: true,
        createdAt: true,
        alertId: true,
      },
    });
    if (notifs.length === 0) return [];

    const alertIds = [...new Set(notifs.map((n) => n.alertId!).filter(Boolean))];
    const emailAlerts = new Set(
      (
        await tx.alert.findMany({
          where: { id: { in: alertIds }, channel: "EMAIL" },
          select: { id: true },
        })
      ).map((a) => a.id),
    );

    return notifs
      .filter((n) => n.alertId && emailAlerts.has(n.alertId))
      .map(({ id, title, body, targetType, targetId, createdAt }) => ({
        id,
        title,
        body,
        targetType,
        targetId,
        createdAt,
      }));
  });
}

/** Mark notifications as email-delivered (idempotent; only flips still-unsent ones). */
export function markNotificationsEmailed(
  orgId: string,
  ids: string[],
): Promise<{ updated: number }> {
  if (ids.length === 0) return Promise.resolve({ updated: 0 });
  return withOrgContext(orgId, async (tx) => {
    const res = await tx.notification.updateMany({
      where: { id: { in: ids }, emailedAt: null },
      data: { emailedAt: new Date() },
    });
    return { updated: res.count };
  });
}
