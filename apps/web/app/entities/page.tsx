import { listEntities } from "@aioi/database";
import { Badge } from "@aioi/ui";

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

export default async function EntitiesPage() {
  const entities = await listEntities({ limit: 300 });

  return (
    <main>
      <h1 style={{ fontSize: "1.5rem", margin: "0 0 4px" }}>Entities</h1>
      <p style={{ color: "var(--fg-muted)", margin: "0 0 20px" }}>
        The companies, models, and tools that keep showing up across trends —{" "}
        {entities.length > 0 ? `${entities.length} tracked.` : "extracted as trends are scored."}
      </p>

      {entities.length === 0 ? (
        <div className="aioi-card" style={{ color: "var(--fg-muted)" }}>
          No entities yet — they&rsquo;re extracted from trends during the scoring pipeline.
        </div>
      ) : (
        <div className="entity-grid">
          {entities.map((e) => (
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
      )}
    </main>
  );
}
