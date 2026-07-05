import { notFound } from "next/navigation";
import { getBrief, markBriefOpened, type BriefContent } from "@aioi/database";
import { Badge, Card } from "@aioi/ui";
import { getDevOrg } from "../../lib/dev-org";

export const dynamic = "force-dynamic";

export default async function BriefDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId } = await getDevOrg();

  const brief = await getBrief(organizationId, id).catch(() => null);
  if (!brief) notFound();
  await markBriefOpened(organizationId, id).catch(() => {}); // open tracking on view
  const content = brief.content as unknown as BriefContent;

  return (
    <main>
      <a href="/briefs" style={{ fontSize: "0.8125rem", color: "var(--primary)" }}>
        ← Briefs
      </a>
      <h1 style={{ fontSize: "1.5rem", margin: "8px 0 4px" }}>{content.headline}</h1>
      <p style={{ color: "var(--fg-muted)", margin: "0 0 20px" }}>
        Generated {new Date(content.generatedAt).toLocaleString()} · {content.watchlistCount}{" "}
        watchlists · {content.unreadAlerts} unread alerts
      </p>

      <h2 style={{ fontSize: "1.125rem", margin: "0 0 8px" }}>Top opportunities</h2>
      {content.topTrends.length === 0 ? (
        <div className="aioi-card" style={{ color: "var(--fg-muted)" }}>
          No scored trends yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {content.topTrends.map((t) => (
            <Card key={t.slug}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <a
                  href={`/trends/${t.slug}`}
                  style={{ fontWeight: 600, color: "var(--fg)", textDecoration: "none" }}
                >
                  {t.title}
                </a>
                <span style={{ marginLeft: "auto" }}>
                  <Badge band="high">{t.opportunity}</Badge>
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
