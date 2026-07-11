import { listEntities, listTrackedEntities, type TrackedSort } from "@aioi/database";
import { Badge, MomentumTag } from "@aioi/ui";

type TrackedType = "MODEL" | "MCP_SERVER" | "REPO";

export const dynamic = "force-dynamic";

export const TYPE_LABELS: Record<string, string> = {
  COMPANY: "Company",
  MODEL: "Model",
  TOOL: "Tool",
  MCP_SERVER: "Protocol",
  PERSON: "Person",
  REPO: "Repo",
  PAPER: "Paper",
};

// Supply-side tracking filters (ADR-0005). `undefined` type = all tracked types.
const TYPE_FILTERS: { key: string; type?: TrackedType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "model", type: "MODEL", label: "Models" },
  { key: "mcp", type: "MCP_SERVER", label: "MCP servers" },
  { key: "repo", type: "REPO", label: "Repos" },
];
const SORTS: { key: TrackedSort; label: string }[] = [
  { key: "momentum", label: "Momentum" },
  { key: "signal", label: "Signal" },
  { key: "recent", label: "Newest" },
];

function hrefWith(type: string, sort: string): string {
  const q = new URLSearchParams();
  if (type !== "all") q.set("type", type);
  if (sort !== "momentum") q.set("sort", sort);
  const s = q.toString();
  return s ? `/entities?${s}` : "/entities";
}

export default async function EntitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const activeFilter = TYPE_FILTERS.find((f) => f.key === sp.type) ?? TYPE_FILTERS[0]!;
  const sort: TrackedSort = SORTS.find((s) => s.key === sp.sort)?.key ?? "momentum";

  const tracked = await listTrackedEntities({ type: activeFilter.type, sort });
  const directory = await listEntities({ limit: 300 });

  return (
    <main>
      <h1 style={{ fontSize: "1.5rem", margin: "0 0 4px" }}>Supply-side tracking</h1>
      <p style={{ color: "var(--fg-muted)", margin: "0 0 16px" }}>
        The models, MCP servers, and repos builders are moving on — ranked by momentum across the
        trends that mention them. The supply side of the opportunity.
      </p>

      <div className="entity-toolbar" role="group" aria-label="Filter and sort tracked entities">
        <div className="entity-filters" role="group" aria-label="Filter by type">
          {TYPE_FILTERS.map((f) => (
            <a
              key={f.key}
              href={hrefWith(f.key, sort)}
              className="entity-chip"
              aria-current={f.key === activeFilter.key ? "page" : undefined}
            >
              {f.label}
            </a>
          ))}
        </div>
        <div className="entity-filters" role="group" aria-label="Sort by">
          {SORTS.map((s) => (
            <a
              key={s.key}
              href={hrefWith(activeFilter.key, s.key)}
              className="entity-chip"
              aria-current={s.key === sort ? "page" : undefined}
            >
              {s.label}
            </a>
          ))}
        </div>
      </div>

      {tracked.length === 0 ? (
        <div className="aioi-card" style={{ color: "var(--fg-muted)" }}>
          No tracked entities yet — models, MCP servers, and repos surface as trends are scored and
          snapshots accrue run over run.
        </div>
      ) : (
        <ul className="entity-board" aria-label="Tracked entities by momentum">
          {tracked.map((e) => (
            <li key={e.id}>
              <a href={`/entities/${e.id}`} className="entity-row">
                <span className="entity-row-main">
                  <span className="entity-name">{e.name}</span>
                  <span className="entity-meta">
                    <Badge>{TYPE_LABELS[e.type] ?? e.type}</Badge>
                    <span>
                      {e.signalWeight} signal{e.signalWeight === 1 ? "" : "s"} ·{" "}
                      {e.linkedTrendCount} {e.linkedTrendCount === 1 ? "trend" : "trends"}
                    </span>
                  </span>
                </span>
                {e.momentum && <MomentumTag momentum={e.momentum} />}
              </a>
            </li>
          ))}
        </ul>
      )}

      {directory.length > 0 && (
        <>
          <h2 style={{ fontSize: "1.125rem", margin: "28px 0 4px" }}>All entities</h2>
          <p style={{ color: "var(--fg-muted)", margin: "0 0 16px" }}>
            Everything extracted across trends — companies and people too — most-mentioned first.
          </p>
          <div className="entity-grid">
            {directory.map((e) => (
              <a key={e.id} href={`/entities/${e.id}`} className="entity-card">
                <div className="entity-name">{e.name}</div>
                <div className="entity-meta">
                  <Badge>{TYPE_LABELS[e.type] ?? e.type}</Badge>
                  <span>
                    {e.trendCount} {e.trendCount === 1 ? "trend" : "trends"}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
