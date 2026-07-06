import { getSourceStats, type SourceStat } from "@aioi/database";
import { Badge, Card, DataTable, type Column } from "@aioi/ui";

export const dynamic = "force-dynamic";

// Global (system) view — Source/Signal are not tenant-scoped. Route access is gated by middleware.
function tierBand(tier: string): "high" | "medium" | "low" {
  if (tier === "OFFICIAL") return "high";
  if (tier === "GRAY") return "medium";
  return "low";
}

const columns: Array<Column<SourceStat>> = [
  { key: "source", header: "Source", render: (r) => r.source },
  {
    key: "signals",
    header: "Signals",
    align: "right",
    render: (r) => r.signalCount.toLocaleString(),
  },
  {
    key: "last",
    header: "Last ingested",
    render: (r) => (r.lastFetchedAt ? new Date(r.lastFetchedAt).toLocaleString() : "—"),
  },
  {
    key: "lastRun",
    header: "Last run",
    render: (r) =>
      r.lastRun ? (
        <span>
          <Badge band={r.lastRun.status === "SUCCEEDED" ? "high" : "low"}>{r.lastRun.status}</Badge>{" "}
          +{r.lastRun.itemCount} new
          {r.lastRun.finishedAt ? ` · ${new Date(r.lastRun.finishedAt).toLocaleString()}` : ""}
        </span>
      ) : (
        "—"
      ),
  },
  {
    key: "legality",
    header: "Legality",
    render: (r) => <Badge band={tierBand(r.legalityTier)}>{r.legalityTier}</Badge>,
  },
];

export default async function SourcesPage() {
  const stats = await getSourceStats();
  const totalSignals = stats.reduce((sum, r) => sum + r.signalCount, 0);

  return (
    <main>
      <h1 style={{ fontSize: "1.5rem", margin: "0 0 4px" }}>Sources</h1>
      <p style={{ color: "var(--fg-muted)", margin: "0 0 16px" }}>
        {stats.length} {stats.length === 1 ? "connector" : "connectors"} ·{" "}
        {totalSignals.toLocaleString()} signals ingested
      </p>
      <Card>
        <DataTable
          columns={columns}
          rows={stats}
          getRowKey={(r) => r.source}
          empty="No signals ingested yet — run an ingestion pass."
        />
      </Card>
    </main>
  );
}
