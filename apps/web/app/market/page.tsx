import type { Metadata } from "next";
import { listTrendsQuadrant, listTrackedEntities, listRecentFunding } from "@aioi/database";
import { Badge, MomentumTag } from "@aioi/ui";
import { getSiteUrl } from "../lib/site";
import { TYPE_LABELS } from "../entities/page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Market intelligence",
  description:
    "The AI opportunity market at a glance — demand × supply: the Golden-Quadrant split, the fastest-moving models/repos, and the latest funding.",
  alternates: { canonical: `${getSiteUrl()}/market` },
};

const QUAD_LABELS: Record<string, string> = {
  build: "Build now",
  crowded: "Crowded",
  early: "Too early",
  hype: "Hype",
};

function fmtDate(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";
}

export default async function MarketPage() {
  const [quadrant, tracked, funding] = await Promise.all([
    listTrendsQuadrant(300),
    listTrackedEntities({ sort: "momentum", limit: 100 }),
    listRecentFunding(8),
  ]);

  const counts = { build: 0, crowded: 0, early: 0, hype: 0 } as Record<string, number>;
  for (const t of quadrant) counts[t.quadrant] = (counts[t.quadrant] ?? 0) + 1;
  const buildNow = quadrant
    .filter((t) => t.quadrant === "build")
    .sort((a, b) => (b.opportunity ?? 0) - (a.opportunity ?? 0))
    .slice(0, 6);
  const rising = tracked.filter((e) => e.momentum?.state === "accelerating").slice(0, 6);

  return (
    <main>
      <h1 style={{ fontSize: "1.5rem", margin: "0 0 4px" }}>Market intelligence</h1>
      <p style={{ color: "var(--fg-muted)", margin: "0 0 20px" }}>
        The AI opportunity market at a glance — <strong>demand × supply</strong>: where to build,
        what builders are moving on, and where the money is going.
      </p>

      {/* Quadrant split */}
      <section aria-label="Golden Quadrant split" style={{ marginBottom: 28 }}>
        <div className="market-stats">
          {(["build", "crowded", "early", "hype"] as const).map((q) => (
            <a key={q} href="/quadrant" className={`market-stat is-${q}`}>
              <span className="market-stat-n">{counts[q] ?? 0}</span>
              <span className="market-stat-l">{QUAD_LABELS[q]}</span>
            </a>
          ))}
        </div>
      </section>

      <div className="market-cols">
        {/* Build now */}
        <section aria-label="Build-now opportunities">
          <h2 className="market-h2">Build now</h2>
          <p className="market-sub">High demand, low supply — worth acting on.</p>
          {buildNow.length === 0 ? (
            <p className="muted-note">No build-now opportunities yet.</p>
          ) : (
            <ul className="entity-board">
              {buildNow.map((t) => (
                <li key={t.slug}>
                  <a href={`/trends/${t.slug}`} className="entity-row">
                    <span className="entity-row-main">
                      <span className="entity-name">{t.title}</span>
                      <span className="entity-meta">
                        <span>demand {t.demand}</span>
                        <span>supply {t.supply}</span>
                      </span>
                    </span>
                    {t.opportunity !== null && <Badge>{t.opportunity}</Badge>}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Supply momentum */}
        <section aria-label="Rising supply">
          <h2 className="market-h2">Rising supply</h2>
          <p className="market-sub">
            Models, MCP servers, and repos gaining momentum —{" "}
            <a href="/entities" style={{ color: "var(--primary)" }}>
              track them
            </a>
            .
          </p>
          {rising.length === 0 ? (
            <p className="muted-note">No accelerating entities yet.</p>
          ) : (
            <ul className="entity-board">
              {rising.map((e) => (
                <li key={e.id}>
                  <a href={`/entities/${e.id}`} className="entity-row">
                    <span className="entity-row-main">
                      <span className="entity-name">{e.name}</span>
                      <span className="entity-meta">
                        <Badge>{TYPE_LABELS[e.type] ?? e.type}</Badge>
                        <span>{e.signalWeight} signals</span>
                      </span>
                    </span>
                    {e.momentum && <MomentumTag momentum={e.momentum} />}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Funding */}
      <section aria-label="Recent funding" style={{ marginTop: 28 }}>
        <h2 className="market-h2">Recent funding</h2>
        <p className="market-sub">
          US private rounds (SEC EDGAR Form D) — money in is a leading demand signal.{" "}
          <a href="/funding" style={{ color: "var(--primary)" }}>
            All funding
          </a>
          .
        </p>
        {funding.length === 0 ? (
          <p className="muted-note">
            No funding events yet — set <code>SEC_USER_AGENT</code> to enable the source.
          </p>
        ) : (
          <ul className="entity-board">
            {funding.map((f) => (
              <li key={f.id}>
                <div className="entity-row" style={{ cursor: "default" }}>
                  <span className="entity-row-main">
                    <span className="entity-name">
                      {f.url ? (
                        <a href={f.url} target="_blank" rel="noopener noreferrer">
                          {f.issuer}
                        </a>
                      ) : (
                        f.issuer
                      )}
                    </span>
                    <span className="entity-meta" style={{ flexWrap: "wrap" }}>
                      <span>Filed {fmtDate(f.filedAt)}</span>
                      {f.trends.slice(0, 2).map((t) => (
                        <a key={t.slug} href={`/trends/${t.slug}`} className="entity-chip">
                          {t.title}
                        </a>
                      ))}
                    </span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
