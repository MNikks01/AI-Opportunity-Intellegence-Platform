import { listNotifications } from "@aioi/database";
import { Badge, Card } from "@aioi/ui";
import { getDevOrg } from "../lib/dev-org";
import { markAllReadAction, markReadAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const { organizationId } = await getDevOrg();
  const notifications = await listNotifications(organizationId, { limit: 100 });
  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <main>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "0 0 4px" }}>
        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Notifications</h1>
        {unread > 0 && <Badge band="high">{unread} unread</Badge>}
        {unread > 0 && (
          <form action={markAllReadAction} style={{ marginLeft: "auto" }}>
            <button
              type="submit"
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--fg)",
                fontSize: "0.8125rem",
                cursor: "pointer",
              }}
            >
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
          {notifications.map((n) => (
            <Card key={n.id}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontWeight: 600, color: "var(--fg)" }}>{n.title}</span>
                    {!n.readAt && <Badge band="high">new</Badge>}
                  </div>
                  <p style={{ color: "var(--fg-muted)", margin: "4px 0 0", fontSize: "0.875rem" }}>
                    {n.body}
                  </p>
                </div>
                {!n.readAt && (
                  <form action={markReadAction}>
                    <input type="hidden" name="id" value={n.id} />
                    <button
                      type="submit"
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        border: "1px solid var(--border)",
                        background: "transparent",
                        color: "var(--fg-muted)",
                        fontSize: "0.8125rem",
                        cursor: "pointer",
                      }}
                    >
                      Mark read
                    </button>
                  </form>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
