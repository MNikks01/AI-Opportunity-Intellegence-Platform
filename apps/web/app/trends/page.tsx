import { listTrends } from "@aioi/database";
import { TrendCard } from "@aioi/ui";

export const dynamic = "force-dynamic";

export default async function TrendsPage() {
  const trends = await listTrends(50);
  return (
    <main>
      <h1 style={{ fontSize: "1.5rem", margin: "0 0 4px" }}>Trends</h1>
      <p style={{ color: "var(--fg-muted)", margin: "0 0 20px" }}>
        {trends.length} scored {trends.length === 1 ? "trend" : "trends"} from the AI ecosystem.
      </p>
      {trends.length === 0 ? (
        <div className="aioi-card" style={{ color: "var(--fg-muted)" }}>
          No trends yet — run the ingestion + scoring pipeline to populate this dashboard.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "16px",
          }}
        >
          {trends.map((t) => (
            <TrendCard key={t.slug} slug={t.slug} title={t.title} summary={t.summary} scores={t.scores} />
          ))}
        </div>
      )}
    </main>
  );
}
