import { listTrends, searchTrends, semanticSearchTrends } from "@aioi/database";
import { TrendCard } from "@aioi/ui";

export const dynamic = "force-dynamic";

export default async function TrendsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; mode?: string }>;
}) {
  const { q, mode } = await searchParams;
  const query = q?.trim() ?? "";
  const semantic = mode === "semantic";
  const trends = query
    ? semantic
      ? await semanticSearchTrends(query, 50)
      : await searchTrends(query, 50)
    : await listTrends(50);

  return (
    <main>
      <h1 style={{ fontSize: "1.5rem", margin: "0 0 4px" }}>Trends</h1>
      <p style={{ color: "var(--fg-muted)", margin: "0 0 20px" }}>
        {query
          ? `${trends.length} ${trends.length === 1 ? "result" : "results"} for “${query}”.`
          : `${trends.length} scored ${trends.length === 1 ? "trend" : "trends"} from the AI ecosystem.`}
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
    </main>
  );
}
