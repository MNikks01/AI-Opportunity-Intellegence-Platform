import { getSourceStats, type SourceStat } from "@aioi/database";
import { Badge, Card, DataTable, type Column } from "@aioi/ui";

export const dynamic = "force-dynamic";

// Global (system) view — Source/Signal are not tenant-scoped. Route access is gated by middleware.
function tierBand(tier: string): "high" | "medium" | "low" {
  if (tier === "OFFICIAL") return "high";
  if (tier === "GRAY") return "medium";
  return "low";
}

/**
 * The full connector catalog — the source of truth for "which sources exist", independent of whether
 * they've ingested yet. Key-gated sources declare the env var(s) they need; `configured` is read from
 * the server env so an operator can see at a glance which sources are dormant and why.
 */
interface Connector {
  key: string;
  label: string;
  /** Env var(s) required to activate; absent = keyless (always active). */
  gate?: string;
}

const CATALOG: Connector[] = [
  { key: "hackernews", label: "HackerNews" },
  { key: "hnhiring", label: "HN Who’s Hiring" },
  { key: "github", label: "GitHub" },
  { key: "huggingface", label: "Hugging Face" },
  { key: "arxiv", label: "arXiv" },
  { key: "npm", label: "npm" },
  { key: "pypi", label: "PyPI" },
  { key: "youtube", label: "YouTube", gate: "YOUTUBE_API_KEY" },
  { key: "reddit", label: "Reddit", gate: "REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET" },
  { key: "producthunt", label: "Product Hunt", gate: "PRODUCTHUNT_TOKEN" },
];

function gateConfigured(key: string): boolean {
  switch (key) {
    case "reddit":
      return Boolean(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET);
    case "youtube":
      return Boolean(process.env.YOUTUBE_API_KEY);
    case "producthunt":
      return Boolean(process.env.PRODUCTHUNT_TOKEN);
    default:
      return true; // keyless connectors are always "configured"
  }
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
  const byKey = new Map(stats.map((s) => [s.source, s]));

  const connectors = CATALOG.map((c) => {
    const signals = byKey.get(c.key)?.signalCount ?? 0;
    const configured = gateConfigured(c.key);
    const status: "live" | "idle" | "dormant" =
      signals > 0 ? "live" : c.gate && !configured ? "dormant" : "idle";
    return { ...c, signals, status };
  });
  const liveCount = connectors.filter((c) => c.status === "live").length;
  const dormantCount = connectors.filter((c) => c.status === "dormant").length;

  return (
    <main>
      <h1 style={{ fontSize: "1.5rem", margin: "0 0 4px" }}>Sources</h1>
      <p style={{ color: "var(--fg-muted)", margin: "0 0 16px" }}>
        {connectors.length} connectors · <strong>{liveCount}</strong> live ·{" "}
        {totalSignals.toLocaleString()} signals ingested
        {dormantCount > 0 && (
          <>
            {" "}
            · <strong>{dormantCount}</strong> waiting on config
          </>
        )}
      </p>

      <div className="source-grid">
        {connectors.map((c) => (
          <div key={c.key} className={`source-chip is-${c.status}`}>
            <span className="source-dot" aria-hidden />
            <div className="source-chip-body">
              <span className="source-chip-name">{c.label}</span>
              <span className="source-chip-status">
                {c.status === "live" && `${c.signals.toLocaleString()} signals`}
                {c.status === "idle" && "Idle · awaiting next run"}
                {c.status === "dormant" && `Needs setup — set ${c.gate}`}
              </span>
            </div>
          </div>
        ))}
      </div>

      {dormantCount > 0 && (
        <p className="source-hint">
          Dormant sources are wired and legality-classified — they just need their key set (as a
          GitHub Actions secret) and the next ingestion run. See{" "}
          <code>docs/10-setup/ENV_SETUP.md</code>.
        </p>
      )}

      <h2 style={{ fontSize: "1.125rem", margin: "28px 0 10px" }}>Ingestion detail</h2>
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
