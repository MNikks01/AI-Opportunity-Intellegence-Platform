import {
  listTrendsPage,
  searchTrends,
  semanticSearchTrends,
  getSourceStats,
  type TrendSort,
} from "@aioi/database";
import { TrendCard } from "@aioi/ui";
import { TrendControls } from "./TrendControls";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

export default async function TrendsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    mode?: string;
    source?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const query = sp.q?.trim() ?? "";
  const semantic = sp.mode === "semantic";
  const source = sp.source?.trim() ?? "";
  const sort: TrendSort = sp.sort === "score" ? "score" : "recent";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const searching = query.length > 0;

  // Source options for the radios — only connectors that have ingested something.
  const sources = (await getSourceStats()).filter((s) => s.signalCount > 0).map((s) => s.source);

  const result = searching
    ? {
        trends: semantic ? await semanticSearchTrends(query, 50) : await searchTrends(query, 50),
        page: 1,
        pageCount: 1,
        total: 0,
      }
    : await listTrendsPage({ source: source || undefined, sort, page, pageSize: PAGE_SIZE });
  const trends = result.trends;

  // Build a /trends URL for pagination that preserves the active source + sort.
  const pageUrl = (p: number) => {
    const u = new URLSearchParams();
    if (source) u.set("source", source);
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

      {!searching && <TrendControls sources={sources} source={source} sort={sort} />}

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
            />
          ))}
        </div>
      )}

      {!searching && result.pageCount > 1 && (
        <nav className="pagination" aria-label="Trends pagination">
          {page > 1 ? (
            <a href={pageUrl(page - 1)} className="pagination-link">
              ‹ Prev
            </a>
          ) : (
            <span className="pagination-link is-disabled">‹ Prev</span>
          )}
          <span className="pagination-status">
            Page {result.page} of {result.pageCount}
          </span>
          {page < result.pageCount ? (
            <a href={pageUrl(page + 1)} className="pagination-link">
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
