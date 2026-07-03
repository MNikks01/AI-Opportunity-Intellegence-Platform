import { getTrendBySlug } from "@aioi/database";
import { Scorecard } from "@aioi/ui";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TrendDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trend = await getTrendBySlug(slug);
  if (!trend) notFound();

  return (
    <main>
      <a href="/trends" style={{ color: "var(--fg-muted)", fontSize: "0.875rem" }}>
        ← Trends
      </a>
      <h1 style={{ fontSize: "1.75rem", margin: "8px 0 4px" }}>{trend.title}</h1>
      {trend.summary && (
        <p style={{ color: "var(--fg-muted)", margin: "0 0 20px", maxWidth: 640 }}>{trend.summary}</p>
      )}
      <div style={{ maxWidth: 560 }}>
        <Scorecard scores={trend.scores} />
      </div>
    </main>
  );
}
