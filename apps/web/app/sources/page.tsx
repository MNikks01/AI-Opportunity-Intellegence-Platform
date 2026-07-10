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
 * they've ingested yet. Key-gated sources name the env var(s) they need (set in the ingestion cron,
 * not the web app), shown to the operator when a source has never produced a run.
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

  // Status is derived from ingestion data only — the web app can't see the cron's env, so it never
  // guesses whether a key is set. A configured-but-broken source (e.g. expired token) shows its last
  // error; a source that has never produced a run/signal and is key-gated is flagged as needing setup.
  const connectors = CATALOG.map((c) => {
    const stat = byKey.get(c.key);
    const signals = stat?.signalCount ?? 0;
    const run = stat?.lastRun;
    let status: "live" | "failed" | "idle" | "dormant";
    let detail: string;
    if (signals > 0) {
      status = "live";
      detail = `${signals.toLocaleString()} signals`;
    } else if (run?.status === "FAILED") {
      status = "failed";
      detail = run.error ? `Last run failed: ${run.error}` : "Last run failed";
    } else if (c.gate && !stat) {
      status = "dormant";
      detail = `Not ingesting — set ${c.gate} in the ingestion cron`;
    } else {
      status = "idle";
      detail = "Idle · awaiting next run";
    }
    return { ...c, signals, status, detail };
  });
  const liveCount = connectors.filter((c) => c.status === "live").length;
  const failedCount = connectors.filter((c) => c.status === "failed").length;
  const dormantCount = connectors.filter((c) => c.status === "dormant").length;

  return (
    <main>
      <h1 style={{ fontSize: "1.5rem", margin: "0 0 4px" }}>Sources</h1>
      <p style={{ color: "var(--fg-muted)", margin: "0 0 16px" }}>
        {connectors.length} connectors · <strong>{liveCount}</strong> live ·{" "}
        {totalSignals.toLocaleString()} signals ingested
        {failedCount > 0 && (
          <>
            {" "}
            · <strong>{failedCount}</strong> failing
          </>
        )}
        {dormantCount > 0 && (
          <>
            {" "}
            · <strong>{dormantCount}</strong> not set up
          </>
        )}
      </p>

      <div className="source-grid">
        {connectors.map((c) => (
          <div key={c.key} className={`source-chip is-${c.status}`}>
            <span className="source-dot" aria-hidden />
            <div className="source-chip-body">
              <span className="source-chip-name">{c.label}</span>
              <span className="source-chip-status">{c.detail}</span>
            </div>
          </div>
        ))}
      </div>

      {(dormantCount > 0 || failedCount > 0) && (
        <p className="source-hint">
          Sources are configured in the ingestion cron (GitHub Actions secrets), not the web app.{" "}
          <strong>Failing</strong> means the key is set but the API rejected it (e.g. an expired
          token or quota) — the message above is the connector&rsquo;s error. See{" "}
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
