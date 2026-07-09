import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEntityById, listTrendsForEntity, getEntitySeo } from "@aioi/database";
import { Badge } from "@aioi/ui";
import { TYPE_LABELS } from "../page";
import { getSiteUrl } from "../../lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const seo = await getEntitySeo(id);
  if (!seo) return { title: "Entity not found", robots: { index: false } };
  const label = TYPE_LABELS[seo.type as keyof typeof TYPE_LABELS] ?? seo.type;
  const description = `${seo.name} (${label}) in AI — every trend that mentions it, ranked by opportunity.`;
  const url = `${getSiteUrl()}/entities/${id}`;
  return {
    title: `${seo.name} — ${label}`,
    description,
    alternates: { canonical: url },
    openGraph: { title: `${seo.name} — ${label}`, description, url, type: "profile" },
  };
}

export default async function EntityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entity = await getEntityById(id);
  if (!entity) notFound();
  const trends = await listTrendsForEntity(id);

  return (
    <main>
      <a href="/entities" style={{ fontSize: "0.8125rem", color: "var(--primary)" }}>
        ← Entities
      </a>
      <h1 style={{ fontSize: "1.75rem", margin: "8px 0 4px" }}>{entity.name}</h1>
      <p style={{ color: "var(--fg-muted)", margin: "0 0 20px", display: "flex", gap: 10 }}>
        <Badge>{TYPE_LABELS[entity.type] ?? entity.type}</Badge>
        <span>
          appears in {trends.length} {trends.length === 1 ? "trend" : "trends"}
        </span>
      </p>

      {trends.length === 0 ? (
        <div className="aioi-card" style={{ color: "var(--fg-muted)" }}>
          No trends linked to this entity.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {trends.map((t) => (
            <a key={t.slug} href={`/trends/${t.slug}`} className="entity-trend">
              <span>{t.title}</span>
              {t.opportunity !== null && t.band && <Badge band={t.band}>{t.opportunity}</Badge>}
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
