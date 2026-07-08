import { getTrendBySlug } from "@aioi/database";
import { SCORE_DIMENSIONS, INVERTED_DIMENSIONS, type ScoreDimension } from "@aioi/shared";

export const dynamic = "force-dynamic";

const DIM_LABELS: Record<ScoreDimension, string> = {
  opportunity: "Opportunity",
  business: "Business",
  developer: "Developer",
  creator: "Creator",
  seo: "SEO",
  competition: "Competition",
  monetization: "Monetization",
  risk: "Risk",
  difficulty: "Difficulty",
  predictedLifetime: "Predicted lifetime",
};
// Opportunity first, then the rest in canonical order.
const ROWS: ScoreDimension[] = [
  "opportunity",
  ...SCORE_DIMENSIONS.filter((d) => d !== "opportunity"),
];

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ slugs?: string }>;
}) {
  const { slugs } = await searchParams;
  const wanted = (slugs ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);
  const trends = (await Promise.all(wanted.map((s) => getTrendBySlug(s)))).filter(
    (t): t is NonNullable<typeof t> => Boolean(t),
  );

  return (
    <main>
      <a href="/watchlists" style={{ fontSize: "0.8125rem", color: "var(--primary)" }}>
        ← Back
      </a>
      <h1 style={{ fontSize: "1.5rem", margin: "8px 0 4px" }}>Compare trends</h1>
      <p style={{ color: "var(--fg-muted)", margin: "0 0 20px" }}>
        Side-by-side opportunity scorecards. Best value per row is highlighted (↓ = inverted, lower
        is better).
      </p>

      {trends.length < 2 ? (
        <div className="aioi-card" style={{ color: "var(--fg-muted)" }}>
          Select at least 2 trends to compare — use “Compare” on a watchlist with tracked trends.
        </div>
      ) : (
        <div className="compare-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th scope="col" className="compare-corner" />
                {trends.map((t) => (
                  <th key={t.slug} scope="col">
                    <a href={`/trends/${t.slug}`}>{t.title}</a>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((dim) => {
                const vals = trends.map(
                  (t) => t.scores.find((s) => s.dimension === dim)?.value ?? null,
                );
                const present = vals.filter((v): v is number => v !== null);
                const inverted = INVERTED_DIMENSIONS.includes(dim);
                const best =
                  present.length > 1
                    ? inverted
                      ? Math.min(...present)
                      : Math.max(...present)
                    : null;
                return (
                  <tr key={dim} className={dim === "opportunity" ? "compare-opp" : ""}>
                    <th scope="row">
                      {DIM_LABELS[dim]}
                      {inverted ? " ↓" : ""}
                    </th>
                    {vals.map((v, i) => (
                      <td
                        key={i}
                        className={v !== null && best !== null && v === best ? "compare-best" : ""}
                      >
                        {v === null ? "—" : v}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
