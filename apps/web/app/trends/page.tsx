import {
  listTrendsPage,
  searchTrends,
  semanticSearchTrends,
  getSourceStats,
  listWatchlists,
  listWatchedTargetIds,
} from "@aioi/database";
import { TrendCard } from "@aioi/ui";
import { TrendControls } from "./TrendControls";
import { WatchToggle } from "./WatchToggle";
import { getDevOrg } from "../lib/dev-org";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

/** Windowed page numbers with "…" gaps, e.g. 1 … 5 6 7 … 18 (keeps first/last + current ±1). */
function pageWindow(current: number, total: number): (number | "…")[] {
  const pages = new Set<number>([1, total, current]);
  if (current - 1 >= 1) pages.add(current - 1);
  if (current + 1 <= total) pages.add(current + 1);
  const out: (number | "…")[] = [];
  let prev = 0;
  for (const p of [...pages].sort((a, b) => a - b)) {
    if (p - prev > 1) out.push("…");
    out.push(p);
    prev = p;
  }
  return out;
}

export default async function TrendsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    mode?: string;
    source?: string;
    status?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const query = sp.q?.trim() ?? "";
  const semantic = sp.mode === "semantic";
  const source = sp.source?.trim() ?? "";
  const status = sp.status?.trim() ?? "";
  const sort = sp.sort?.trim() || "recent";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const searching = query.length > 0;

  // Source options for the radios — only connectors that have ingested something.
  const sources = (await getSourceStats()).filter((s) => s.signalCount > 0).map((s) => s.source);

  // Which trends are already on the org's primary watchlist (for the card watch toggle).
  const { organizationId } = await getDevOrg();
  const primaryWatchlistId = (await listWatchlists(organizationId))[0]?.id;
  const watchedIds = primaryWatchlistId
    ? await listWatchedTargetIds(organizationId, primaryWatchlistId)
    : new Set<string>();

  const result = searching
    ? {
        trends: semantic ? await semanticSearchTrends(query, 50) : await searchTrends(query, 50),
        page: 1,
        pageCount: 1,
        total: 0,
      }
    : await listTrendsPage({
        source: source || undefined,
        status: status || undefined,
        sort,
        page,
        pageSize: PAGE_SIZE,
      });
  const trends = result.trends;

  // Build a /trends URL for pagination that preserves the active source + status + sort.
  const pageUrl = (p: number) => {
    const u = new URLSearchParams();
    if (source) u.set("source", source);
    if (status) u.set("status", status);
    if (sort !== "recent") u.set("sort", sort);
    if (p > 1) u.set("page", String(p));
    const qs = u.toString();
    return qs ? `/trends?${qs}` : "/trends";
  };

  return (
    <main>
      <h1 style={{ fontSize: "1.5rem", margin: "0 0 4px" }}>Trends</h1>
      <p style={{ color: "var(--fg-muted)", margin: "0 0 20px" }}>
        {searching
          ? `${trends.length} ${trends.length === 1 ? "result" : "results"} for “${query}”.`
          : `${result.total} scored ${result.total === 1 ? "trend" : "trends"}${
              source ? ` from ${source}` : " from the AI ecosystem"
            }.`}
      </p>

      <form
        method="get"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          margin: "0 0 24px",
          maxWidth: 640,
        }}
      >
        <input
          name="q"
          defaultValue={query}
          placeholder="Search trends…"
          aria-label="Search trends"
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: "var(--bg)",
            color: "var(--fg)",
          }}
        />
        <select
          name="mode"
          aria-label="Search mode"
          defaultValue={semantic ? "semantic" : "keyword"}
          style={{
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: "var(--bg)",
            color: "var(--fg)",
          }}
        >
          <option value="keyword">Keyword</option>
          <option value="semantic">Semantic</option>
        </select>
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
          Search
        </button>
        {query && (
          <a
            href="/trends"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0 12px",
              color: "var(--fg-muted)",
              fontSize: "0.875rem",
            }}
          >
            Clear
          </a>
        )}
      </form>

      {!searching && (
        <TrendControls sources={sources} source={source} status={status} sort={sort} />
      )}

      {trends.length === 0 ? (
        <div className="aioi-card" style={{ color: "var(--fg-muted)" }}>
          {query
            ? "No trends match your search."
            : "No trends yet — run the ingestion + scoring pipeline to populate this dashboard."}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
            gap: "16px",
          }}
        >
          {trends.map((t) => (
            <TrendCard
              key={t.slug}
              slug={t.slug}
              title={t.title}
              summary={t.summary}
              scores={t.scores}
              plan={t.plan}
              action={<WatchToggle trendId={t.id} watched={watchedIds.has(t.id)} />}
            />
          ))}
        </div>
      )}

      {!searching && result.pageCount > 1 && (
        <nav className="pagination" aria-label="Trends pagination">
          {page > 1 ? (
            <a href={pageUrl(page - 1)} className="pagination-link" rel="prev">
              ‹ Prev
            </a>
          ) : (
            <span className="pagination-link is-disabled">‹ Prev</span>
          )}
          {pageWindow(result.page, result.pageCount).map((p, i) =>
            p === "…" ? (
              <span key={`gap-${i}`} className="pagination-gap">
                …
              </span>
            ) : (
              <a
                key={p}
                href={pageUrl(p)}
                aria-current={p === result.page ? "page" : undefined}
                className={`pagination-link${p === result.page ? " is-current" : ""}`}
              >
                {p}
              </a>
            ),
          )}
          {page < result.pageCount ? (
            <a href={pageUrl(page + 1)} className="pagination-link" rel="next">
              Next ›
            </a>
          ) : (
            <span className="pagination-link is-disabled">Next ›</span>
          )}
        </nav>
      )}
    </main>
  );
}
