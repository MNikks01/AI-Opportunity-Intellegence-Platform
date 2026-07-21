import type { Metadata } from "next";
import { newsRegionStats } from "@aioi/database";
import { getSiteUrl } from "../lib/site";
import { REGION_ORDER, regionFlag, regionLabel } from "../lib/regions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI News by Region",
  description:
    "Where AI & tech activity is concentrated — signal volume and average opportunity by region.",
  alternates: { canonical: `${getSiteUrl()}/map` },
};

/** Heat level 0–4 from a value relative to the max (for the choropleth cell shade). */
function heat(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(4, Math.ceil((value / max) * 4));
}

export default async function MapPage() {
  const stats = await newsRegionStats();
  const byRegion = new Map(stats.map((s) => [s.region, s]));
  const maxCount = stats.reduce((m, s) => Math.max(m, s.count), 0);

  return (
    <main>
      <h1 style={{ fontSize: "1.5rem", margin: "0 0 4px" }}>AI News by Region</h1>
      <p style={{ color: "var(--fg-muted)", margin: "0 0 16px" }}>
        Where activity is concentrated — analyzed-signal volume and average opportunity per region.
        Darker cells carry more news.
      </p>

      {stats.length === 0 ? (
        <div className="aioi-card" style={{ color: "var(--fg-muted)" }}>
          No analyzed news yet — the map fills in as the analysis pass tags signals by region.
        </div>
      ) : (
        <ul className="heatmap-grid" aria-label="AI news volume by region">
          {REGION_ORDER.map((r) => {
            const s = byRegion.get(r);
            const count = s?.count ?? 0;
            const level = heat(count, maxCount);
            return (
              <li key={r}>
                <a
                  href={`/feed?region=${r}`}
                  className={`heatmap-cell heat-${level}`}
                  aria-label={`${regionLabel(r)}: ${count} stories, average opportunity ${s?.avgOpportunity ?? 0}`}
                >
                  <span className="heatmap-flag">{regionFlag(r)}</span>
                  <span className="heatmap-region">{regionLabel(r)}</span>
                  <span className="heatmap-count">{count}</span>
                  {s && <span className="heatmap-avg">avg opp {s.avgOpportunity}</span>}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
