import { notFound } from "next/navigation";
import { getWatchlist, listAlerts, getTrendsByIds } from "@aioi/database";
import { Badge, Card } from "@aioi/ui";
import { bandForValue } from "@aioi/shared";
import { getDevOrg } from "../../lib/dev-org";
import {
  addItemAction,
  removeItemAction,
  createAlertAction,
  toggleAlertAction,
  deleteAlertAction,
} from "../actions";

type AlertTrigger =
  { type: "NEW_TREND" } | { type: "SCORE_CROSSES"; dimension: string; gte: number };

function describeTrigger(trigger: AlertTrigger): string {
  return trigger.type === "SCORE_CROSSES"
    ? `${trigger.dimension} ≥ ${trigger.gte}`
    : "any new watched trend";
}

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
  const alerts = await listAlerts(organizationId, id);
  // Resolve watched trends so items show a title + score + link instead of a raw id.
  const trendMap = await getTrendsByIds(
    watchlist.items.filter((i) => i.targetType === "TREND").map((i) => i.targetId),
  );

  return (
    <main>
      <a href="/watchlists" style={{ fontSize: "0.8125rem", color: "var(--primary)" }}>
        ← Watchlists
      </a>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", margin: "8px 0 4px" }}>{watchlist.name}</h1>
        {trendMap.size >= 2 && (
          <a
            href={`/trends/compare?slugs=${[...trendMap.values()]
              .slice(0, 4)
              .map((t) => t.slug)
              .join(",")}`}
            className="watch-btn"
          >
            Compare {Math.min(trendMap.size, 4)} trends →
          </a>
        )}
      </div>
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
          {watchlist.items.map((item) => {
            const trend = item.targetType === "TREND" ? trendMap.get(item.targetId) : undefined;
            return (
              <Card key={item.id}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Badge>{item.targetType}</Badge>
                  {trend ? (
                    <>
                      <a
                        href={`/trends/${trend.slug}`}
                        style={{ color: "var(--fg)", fontSize: "0.9rem", textDecoration: "none" }}
                      >
                        {trend.title}
                      </a>
                      {trend.opportunity !== null && (
                        <Badge band={bandForValue(trend.opportunity)}>{trend.opportunity}</Badge>
                      )}
                    </>
                  ) : (
                    <code style={{ color: "var(--fg-muted)", fontSize: "0.8125rem" }}>
                      {item.targetId}
                    </code>
                  )}
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
            );
          })}
        </div>
      )}

      <h2 style={{ fontSize: "1.125rem", margin: "32px 0 4px" }}>Alerts</h2>
      <p style={{ color: "var(--fg-muted)", margin: "0 0 16px", fontSize: "0.875rem" }}>
        Get notified when a watched trend matches. (Dimension &amp; threshold apply to “score
        crosses”.)
      </p>

      <form
        action={createAlertAction}
        style={{ display: "flex", gap: "8px", margin: "0 0 20px", flexWrap: "wrap" }}
      >
        <input type="hidden" name="watchlistId" value={watchlist.id} />
        <select
          name="type"
          aria-label="Trigger type"
          style={inputStyle}
          defaultValue="SCORE_CROSSES"
        >
          <option value="SCORE_CROSSES">Score crosses</option>
          <option value="NEW_TREND">New trend</option>
        </select>
        <select
          name="dimension"
          aria-label="Dimension"
          style={inputStyle}
          defaultValue="opportunity"
        >
          {DIMENSIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <input
          name="gte"
          type="number"
          min={0}
          max={100}
          defaultValue={80}
          aria-label="Threshold"
          style={{ ...inputStyle, width: 90 }}
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
          Add alert
        </button>
      </form>

      {alerts.length === 0 ? (
        <div className="aioi-card" style={{ color: "var(--fg-muted)" }}>
          No alerts on this watchlist yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {alerts.map((alert) => (
            <Card key={alert.id}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Badge>{describeTrigger(alert.trigger as AlertTrigger)}</Badge>
                <span style={{ fontSize: "0.8125rem", color: "var(--fg-muted)" }}>
                  {alert.enabled ? "enabled" : "disabled"}
                </span>
                <form action={toggleAlertAction} style={{ marginLeft: "auto" }}>
                  <input type="hidden" name="id" value={alert.id} />
                  <input type="hidden" name="watchlistId" value={watchlist.id} />
                  <input type="hidden" name="enabled" value={(!alert.enabled).toString()} />
                  <button type="submit" style={ghostButton}>
                    {alert.enabled ? "Disable" : "Enable"}
                  </button>
                </form>
                <form action={deleteAlertAction}>
                  <input type="hidden" name="id" value={alert.id} />
                  <input type="hidden" name="watchlistId" value={watchlist.id} />
                  <button type="submit" style={ghostButton}>
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

const DIMENSIONS = [
  "opportunity",
  "business",
  "developer",
  "creator",
  "seo",
  "competition",
  "monetization",
  "risk",
  "difficulty",
  "predicted_lifetime",
] as const;

const ghostButton = {
  padding: "4px 10px",
  borderRadius: "6px",
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--fg-muted)",
  fontSize: "0.8125rem",
  cursor: "pointer",
} as const;
