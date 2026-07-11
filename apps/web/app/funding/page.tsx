import type { Metadata } from "next";
import { listRecentFunding } from "@aioi/database";
import { getSiteUrl } from "../lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI funding",
  description:
    "Recent US private funding rounds in AI (SEC EDGAR Form D) — money moving into a space is a leading indicator of demand.",
  alternates: { canonical: `${getSiteUrl()}/funding` },
};

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function FundingPage() {
  const events = await listRecentFunding(100);

  return (
    <main>
      <h1 style={{ fontSize: "1.5rem", margin: "0 0 4px" }}>AI funding</h1>
      <p style={{ color: "var(--fg-muted)", margin: "0 0 8px" }}>
        Recent private funding rounds in AI — money moving into a space is a leading indicator of
        demand, so a filing lifts the trends it maps to on the{" "}
        <a href="/quadrant" style={{ color: "var(--primary)" }}>
          Golden Quadrant
        </a>
        .
      </p>
      <p style={{ color: "var(--fg-muted)", fontSize: "0.8125rem", margin: "0 0 20px" }}>
        Source: <strong>SEC EDGAR Form D</strong> (official, public-domain).{" "}
        <strong>US-only</strong> in v1 — Form D covers US-domiciled offerings; amounts are often
        undisclosed.
      </p>

      {events.length === 0 ? (
        <div className="aioi-card" style={{ color: "var(--fg-muted)" }}>
          No funding events yet — the SEC EDGAR source activates once <code>SEC_USER_AGENT</code> is
          set (SEC&rsquo;s fair-access policy), then fills in run over run.
        </div>
      ) : (
        <ul className="entity-board" aria-label="Recent AI funding events">
          {events.map((e) => (
            <li key={e.id}>
              <div className="entity-row" style={{ cursor: "default" }}>
                <span className="entity-row-main">
                  <span className="entity-name">
                    {e.url ? (
                      <a href={e.url} target="_blank" rel="noopener noreferrer">
                        {e.issuer}
                      </a>
                    ) : (
                      e.issuer
                    )}
                  </span>
                  <span className="entity-meta" style={{ flexWrap: "wrap" }}>
                    <span>Filed {fmtDate(e.filedAt)}</span>
                    {e.trends.map((t) => (
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
    </main>
  );
}
