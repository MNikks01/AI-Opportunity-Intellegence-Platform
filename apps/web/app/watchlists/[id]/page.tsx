import { notFound } from "next/navigation";
import { getWatchlist } from "@aioi/database";
import { Badge, Card } from "@aioi/ui";
import { getDevOrg } from "../../lib/dev-org";
import { addItemAction, removeItemAction } from "../actions";

export const dynamic = "force-dynamic";

const inputStyle = {
  padding: "8px 12px",
  borderRadius: "8px",
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--fg)",
} as const;

export default async function WatchlistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId } = await getDevOrg();

  const watchlist = await getWatchlist(organizationId, id).catch(() => null);
  if (!watchlist) notFound();

  return (
    <main>
      <a href="/watchlists" style={{ fontSize: "0.8125rem", color: "var(--primary)" }}>
        ← Watchlists
      </a>
      <h1 style={{ fontSize: "1.5rem", margin: "8px 0 4px" }}>{watchlist.name}</h1>
      <p style={{ color: "var(--fg-muted)", margin: "0 0 20px" }}>
        {watchlist.items.length} {watchlist.items.length === 1 ? "item" : "items"}
      </p>

      <form
        action={addItemAction}
        style={{ display: "flex", gap: "8px", margin: "0 0 24px", flexWrap: "wrap" }}
      >
        <input type="hidden" name="watchlistId" value={watchlist.id} />
        <select name="targetType" aria-label="Target type" style={inputStyle} defaultValue="TREND">
          <option value="TREND">Trend</option>
          <option value="ENTITY">Entity</option>
          <option value="TOPIC">Topic</option>
        </select>
        <input
          name="targetId"
          required
          maxLength={200}
          placeholder="Target id or topic slug…"
          aria-label="Target id"
          style={{ ...inputStyle, flex: 1, minWidth: 200 }}
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
          Add
        </button>
      </form>

      {watchlist.items.length === 0 ? (
        <div className="aioi-card" style={{ color: "var(--fg-muted)" }}>
          No items yet — add a trend, entity, or topic above.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {watchlist.items.map((item) => (
            <Card key={item.id}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Badge>{item.targetType}</Badge>
                <code style={{ color: "var(--fg)", fontSize: "0.875rem" }}>{item.targetId}</code>
                <form action={removeItemAction} style={{ marginLeft: "auto" }}>
                  <input type="hidden" name="watchlistId" value={watchlist.id} />
                  <input type="hidden" name="itemId" value={item.id} />
                  <button
                    type="submit"
                    aria-label="Remove item"
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
                    Remove
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
