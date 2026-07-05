import { listBriefs, type BriefContent } from "@aioi/database";
import { Badge, Card } from "@aioi/ui";
import { getDevOrg } from "../lib/dev-org";
import { generateBriefAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function BriefsPage() {
  const { organizationId } = await getDevOrg();
  const briefs = await listBriefs(organizationId);

  return (
    <main>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "0 0 4px" }}>
        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Daily briefs</h1>
        <form action={generateBriefAction} style={{ marginLeft: "auto" }}>
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
            Generate today&apos;s brief
          </button>
        </form>
      </div>
      <p style={{ color: "var(--fg-muted)", margin: "0 0 20px" }}>
        A digest of the top opportunities and your watchlist activity.
      </p>

      {briefs.length === 0 ? (
        <div className="aioi-card" style={{ color: "var(--fg-muted)" }}>
          No briefs yet — generate your first above.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {briefs.map((b) => {
            const content = b.content as unknown as BriefContent;
            return (
              <Card key={b.id}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <a
                    href={`/briefs/${b.id}`}
                    style={{ fontWeight: 600, color: "var(--fg)", textDecoration: "none" }}
                  >
                    {content.headline}
                  </a>
                  {!b.openedAt && <Badge band="high">new</Badge>}
                  <span
                    style={{ marginLeft: "auto", color: "var(--fg-muted)", fontSize: "0.8125rem" }}
                  >
                    {new Date(b.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
