import { listTrendsQuadrant, QUADRANT_MIDPOINT, type QuadrantTrend } from "@aioi/database";
import { Badge } from "@aioi/ui";

export const dynamic = "force-dynamic";

const W = 560;
const H = 430;
const P = 48;
const plotW = W - 2 * P;
const plotH = H - 2 * P;
const px = (supply: number) => P + (supply / 100) * plotW;
const py = (demand: number) => P + (1 - demand / 100) * plotH; // inverted: high demand = top

const QUAD_META: Record<QuadrantTrend["quadrant"], { label: string; blurb: string }> = {
  build: { label: "Build now", blurb: "High demand, low supply." },
  crowded: { label: "Crowded", blurb: "Wanted, but contested." },
  early: { label: "Too early", blurb: "Quiet on both sides." },
  hype: { label: "Hype", blurb: "Built, but little pull." },
};

export default async function QuadrantPage() {
  const trends = await listTrendsQuadrant(300);
  const mid = QUADRANT_MIDPOINT;
  const build = trends
    .filter((t) => t.quadrant === "build")
    .sort((a, b) => (b.opportunity ?? 0) - (a.opportunity ?? 0));

  return (
    <main>
      <h1 style={{ fontSize: "1.5rem", margin: "0 0 4px" }}>The Golden Quadrant</h1>
      <p style={{ color: "var(--fg-muted)", margin: "0 0 4px", maxWidth: 640 }}>
        Every scored trend plotted on <strong>demand</strong> (business viability) ×{" "}
        <strong>supply</strong> (competition). The top-left — high demand, low supply — is where to
        build.
      </p>
      <p
        style={{
          color: "var(--fg-faint, var(--fg-muted))",
          fontSize: "0.75rem",
          margin: "0 0 20px",
        }}
      >
        Demand uses the model&rsquo;s business score today; mined &ldquo;I wish there was…&rdquo;
        signals fold in next.
      </p>

      <div className="quadrant-chart-wrap">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="quadrant-chart"
          role="img"
          aria-label="Trends plotted by demand (vertical) and supply (horizontal)"
        >
          {/* Build-now region highlight (top-left) */}
          <rect
            x={px(0)}
            y={py(100)}
            width={px(mid) - px(0)}
            height={py(mid) - py(100)}
            className="quad-region"
          />
          {/* Mid crosshairs + frame */}
          <line x1={P} y1={py(mid)} x2={W - P} y2={py(mid)} className="quad-axis" />
          <line x1={px(mid)} y1={P} x2={px(mid)} y2={H - P} className="quad-axis" />
          <rect x={P} y={P} width={plotW} height={plotH} className="quad-frame" />

          {/* Quadrant corner labels */}
          <text x={px(mid) - 10} y={P + 16} textAnchor="end" className="quad-lab quad-lab-build">
            BUILD NOW
          </text>
          <text x={px(mid) + 10} y={P + 16} className="quad-lab">
            CROWDED
          </text>
          <text x={px(mid) - 10} y={H - P - 8} textAnchor="end" className="quad-lab">
            TOO EARLY
          </text>
          <text x={px(mid) + 10} y={H - P - 8} className="quad-lab">
            HYPE
          </text>

          {/* Points */}
          {trends.map((t) => (
            <a key={t.slug} href={`/trends/${t.slug}`}>
              <circle
                cx={px(t.supply)}
                cy={py(t.demand)}
                r={t.quadrant === "build" ? 5 : 3.5}
                className={`quad-pt quad-pt-${t.quadrant}`}
              >
                <title>{`${t.title} — demand ${t.demand}, supply ${t.supply}`}</title>
              </circle>
            </a>
          ))}

          {/* Axis titles */}
          <text x={W / 2} y={H - 12} textAnchor="middle" className="quad-axis-title">
            Supply — competition →
          </text>
          <text
            x={-H / 2}
            y={16}
            textAnchor="middle"
            transform="rotate(-90)"
            className="quad-axis-title"
          >
            Demand — business →
          </text>
        </svg>
      </div>

      <div className="quadrant-legend">
        {(["build", "crowded", "early", "hype"] as const).map((q) => (
          <span key={q} className="quadrant-legend-item">
            <span className={`quad-dot quad-pt-${q}`} />
            <b>{QUAD_META[q].label}</b> — {QUAD_META[q].blurb}
          </span>
        ))}
      </div>

      <h2 style={{ fontSize: "1.25rem", margin: "36px 0 4px" }}>Build now — {build.length}</h2>
      <p style={{ color: "var(--fg-muted)", fontSize: "0.8125rem", margin: "0 0 14px" }}>
        High demand, low supply — sorted by opportunity.
      </p>
      {build.length === 0 ? (
        <div className="aioi-card" style={{ color: "var(--fg-muted)" }}>
          Nothing in the build-now quadrant right now.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {build.map((t) => (
            <a key={t.slug} href={`/trends/${t.slug}`} className="entity-trend">
              <span>{t.title}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: "var(--fg-muted)", fontSize: "0.72rem" }}>
                  demand {t.demand} · supply {t.supply}
                </span>
                {t.opportunity !== null && <Badge>{t.opportunity}</Badge>}
              </span>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
