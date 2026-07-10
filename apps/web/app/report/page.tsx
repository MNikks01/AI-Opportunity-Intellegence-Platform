import type { Metadata } from "next";
import {
  listTrendsPage,
  listTrendsQuadrant,
  listEntities,
  getSourceStats,
  getTrendMomentumMap,
} from "@aioi/database";
import { Badge } from "@aioi/ui";
import { ReportActions } from "./ReportActions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "State of AI Opportunities",
  description:
    "A live snapshot of the AI opportunity landscape — the top-scored trends, the build-now quadrant, the most-tracked entities, and where the signal is coming from.",
  alternates: { canonical: "/report" },
};

const QUAD_LABEL: Record<string, string> = {
  build: "Build now",
  crowded: "Crowded",
  early: "Too early",
  hype: "Hype",
};

const fmt = (n: number) => n.toLocaleString();

export default async function ReportPage() {
  const [page, quadrant, entities, sources] = await Promise.all([
    listTrendsPage({ sort: "opportunity", pageSize: 30 }),
    listTrendsQuadrant(400),
    listEntities({ limit: 10 }),
    getSourceStats(),
  ]);
  const topTrends = page.trends.slice(0, 6);

  const momentum = await getTrendMomentumMap(page.trends.map((t) => t.id));
  const accelerating = page.trends
    .map((t) => ({ trend: t, m: momentum.get(t.id) }))
    .filter((x) => x.m && x.m.state === "accelerating")
    .sort((a, b) => (b.m!.delta ?? 0) - (a.m!.delta ?? 0))
    .slice(0, 5);

  const quadCounts: Record<"build" | "crowded" | "early" | "hype", number> = {
    build: 0,
    crowded: 0,
    early: 0,
    hype: 0,
  };
  for (const t of quadrant) quadCounts[t.quadrant] += 1;
  const quadTotal = quadrant.length || 1;

  const liveSources = sources
    .filter((s) => s.signalCount > 0)
    .sort((a, b) => b.signalCount - a.signalCount);
  const maxSignals = liveSources[0]?.signalCount || 1;
  const totalSignals = sources.reduce((n, s) => n + s.signalCount, 0);

  const opp = (t: (typeof topTrends)[number]) =>
    t.scores.find((s) => s.dimension === "opportunity");

  const asOf = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="report">
      <div className="report-topline">
        <p className="report-eyebrow">Live snapshot · updated continuously</p>
        <ReportActions />
      </div>
      <h1 className="report-title">The State of AI Opportunities</h1>
      {/* Dateline so the exported PDF (and the page) reads as a dated, standalone artifact. */}
      <p className="report-asof">As of {asOf}</p>
      <p className="report-sub">
        Where the AI opportunity is right now — scored, quantified, and sourced from where builders
        ship first.
      </p>
      <div className="report-stats">
        <div>
          <strong>{fmt(page.total)}</strong>
          <span>scored trends</span>
        </div>
        <div>
          <strong>{fmt(totalSignals)}</strong>
          <span>signals</span>
        </div>
        <div>
          <strong>{fmt(quadCounts.build)}</strong>
          <span>build-now opportunities</span>
        </div>
        <div>
          <strong>{liveSources.length}</strong>
          <span>live sources</span>
        </div>
      </div>

      <section className="report-section">
        <h2>Top opportunities</h2>
        <div className="home-grid">
          {topTrends.map((t) => {
            const o = opp(t);
            return (
              <a key={t.slug} href={`/trends/${t.slug}`} className="home-trend">
                <div className="home-trend-head">
                  <strong>{t.title}</strong>
                  {o && <Badge band={o.band}>{o.value}</Badge>}
                </div>
                {t.plan?.topIdea && <p className="home-trend-idea">💡 {t.plan.topIdea}</p>}
              </a>
            );
          })}
        </div>
        <a href="/trends?sort=opportunity" className="home-link">
          View all trends →
        </a>
      </section>

      <section className="report-section">
        <h2>The Golden Quadrant</h2>
        <p className="report-muted">
          Every trend on demand × supply. The <strong>build-now</strong> quadrant is high demand,
          low supply.
        </p>
        <div className="report-quadbars">
          {(["build", "crowded", "early", "hype"] as const).map((q) => (
            <div key={q} className="report-quadbar">
              <div className="report-quadbar-head">
                <span className={`quad-dot quad-pt-${q}`} />
                <b>{QUAD_LABEL[q]}</b>
                <span className="report-quadbar-count">{quadCounts[q]}</span>
              </div>
              <div className="report-bar-track">
                <div
                  className={`report-bar-fill report-bar-${q}`}
                  style={{ width: `${Math.round((quadCounts[q] / quadTotal) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <a href="/quadrant" className="home-link">
          Explore the quadrant →
        </a>
      </section>

      {accelerating.length > 0 && (
        <section className="report-section">
          <h2>Momentum leaders</h2>
          <p className="report-muted">
            Trends accelerating fastest by signal volume (last 7 days).
          </p>
          <div className="report-list">
            {accelerating.map(({ trend, m }) => (
              <a key={trend.slug} href={`/trends/${trend.slug}`} className="entity-trend">
                <span>{trend.title}</span>
                <span style={{ color: "#26a269", fontWeight: 700, fontSize: "0.85rem" }}>
                  ▲ +{m!.delta}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="report-section">
        <h2>Most-tracked entities</h2>
        <p className="report-muted">
          The companies, models &amp; tools recurring across the most trends.
        </p>
        <div className="report-chips">
          {entities.map((e) => (
            <a key={e.id} href={`/entities/${e.id}`} className="trend-entity-chip">
              {e.name}
              <span className="trend-entity-type">{e.trendCount}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="report-section">
        <h2>Where the signal comes from</h2>
        <div className="report-sources">
          {liveSources.map((s) => (
            <div key={s.source} className="report-quadbar">
              <div className="report-quadbar-head">
                <b>{s.source}</b>
                <span className="report-quadbar-count">{fmt(s.signalCount)}</span>
              </div>
              <div className="report-bar-track">
                <div
                  className="report-bar-fill report-bar-signal"
                  style={{ width: `${Math.round((s.signalCount / maxSignals) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="home-final">
        <h2>Find your next thing to build.</h2>
        <div className="home-cta" style={{ justifyContent: "center" }}>
          <a className="home-btn home-btn-primary" href="/trends">
            Browse all trends →
          </a>
        </div>
      </section>
    </main>
  );
}
