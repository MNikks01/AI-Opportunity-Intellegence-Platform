import { listWatchlists } from "@aioi/database";
import { Badge, Card } from "@aioi/ui";
import { getDevOrg } from "../lib/dev-org";
import { createWatchlistAction, deleteWatchlistAction } from "./actions";
import { UpgradeNotice } from "./UpgradeNotice";

export const dynamic = "force-dynamic";

export default async function WatchlistsPage({
  searchParams,
}: {
  searchParams: Promise<{ limit?: string }>;
}) {
  const { organizationId } = await getDevOrg();
  const lists = await listWatchlists(organizationId);
  const { limit } = await searchParams;

  return (
    <main>
      <h1 style={{ fontSize: "1.5rem", margin: "0 0 4px" }}>Watchlists</h1>
      <p style={{ color: "var(--fg-muted)", margin: "0 0 20px" }}>
        Track trends, entities, and topics you care about.
      </p>

      {limit === "watchlists" && <UpgradeNotice feature="watchlists" />}

      <form
        action={createWatchlistAction}
        style={{ display: "flex", gap: "8px", margin: "0 0 24px", maxWidth: 460 }}
      >
        <input
          name="name"
          required
          maxLength={120}
          placeholder="New watchlist name…"
          aria-label="Watchlist name"
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: "var(--bg)",
            color: "var(--fg)",
          }}
        />
        <button
          type="submit"
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "1px solid var(--primary)",
            background: "var(--primary)",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Create
        </button>
      </form>

      {lists.length === 0 ? (
        <div className="aioi-card" style={{ color: "var(--fg-muted)" }}>
          No watchlists yet — create your first above.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          {lists.map((wl) => (
            <Card key={wl.id}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <a
                  href={`/watchlists/${wl.id}`}
                  style={{ fontWeight: 600, color: "var(--fg)", textDecoration: "none" }}
                >
                  {wl.name}
                </a>
                <Badge>{wl._count.items} items</Badge>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginTop: "12px",
                }}
              >
                <a
                  href={`/watchlists/${wl.id}`}
                  style={{ fontSize: "0.8125rem", color: "var(--primary)" }}
                >
                  Open →
                </a>
                <form action={deleteWatchlistAction} style={{ marginLeft: "auto" }}>
                  <input type="hidden" name="id" value={wl.id} />
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
                    Delete
                  </button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
