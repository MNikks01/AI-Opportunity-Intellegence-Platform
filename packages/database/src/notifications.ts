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
