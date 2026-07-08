import { listNotifications, getTrendsByIds } from "@aioi/database";
import { Badge } from "@aioi/ui";
import { getDevOrg } from "../lib/dev-org";
import { markAllReadAction, markReadAction } from "./actions";

export const dynamic = "force-dynamic";

function relTime(d: Date): string {
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString();
}

export default async function NotificationsPage() {
  const { organizationId } = await getDevOrg();
  const notifications = await listNotifications(organizationId, { limit: 100 });
  const unread = notifications.filter((n) => !n.readAt).length;
  // Resolve the trend behind each notification so we can link to it.
  const trendMap = await getTrendsByIds(
    notifications
      .filter((n) => n.targetType === "TREND" && n.targetId)
      .map((n) => n.targetId as string),
  );

  return (
    <main>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "0 0 4px" }}>
        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Notifications</h1>
        {unread > 0 && <Badge band="high">{unread} unread</Badge>}
        {unread > 0 && (
          <form action={markAllReadAction} style={{ marginLeft: "auto" }}>
            <button type="submit" className="notif-btn">
              Mark all read
            </button>
          </form>
        )}
      </div>
      <p style={{ color: "var(--fg-muted)", margin: "0 0 20px" }}>
        Fired when your watchlist alerts match.
      </p>

      {notifications.length === 0 ? (
        <div className="aioi-card" style={{ color: "var(--fg-muted)" }}>
          No notifications yet — add an alert to a watchlist.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {notifications.map((n) => {
            const trend =
              n.targetType === "TREND" && n.targetId ? trendMap.get(n.targetId) : undefined;
            return (
              <div key={n.id} className={`aioi-card notif${n.readAt ? " notif--read" : ""}`}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="notif-head">
                      <span className="notif-title">{n.title}</span>
                      {!n.readAt && <Badge band="high">new</Badge>}
                      <time className="notif-time">{relTime(n.createdAt)}</time>
                    </div>
                    <p className="notif-body">{n.body}</p>
                    {trend && (
                      <a href={`/trends/${trend.slug}`} className="notif-link">
                        View {trend.title}
                        {trend.opportunity !== null ? ` · opportunity ${trend.opportunity}` : ""} →
                      </a>
                    )}
                  </div>
                  {!n.readAt && (
                    <form action={markReadAction}>
                      <input type="hidden" name="id" value={n.id} />
                      <button type="submit" className="notif-btn">
                        Mark read
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
