import { notFound } from "next/navigation";
import { getNewsItem } from "@aioi/database";
import { regionFlag, regionLabel } from "../../lib/regions";

export const dynamic = "force-dynamic";

/** The subset of the analysis payload we render (defensive — payload is model-authored JSON). */
interface AnalysisPayload {
  executiveSummary?: string;
  whyItMatters?: string;
  difficulty?: string;
  industry?: string;
  estMarketImpact?: string;
  actionItems?: string[];
  skillsToLearn?: string[];
  companiesAffected?: string[];
  techMentioned?: string[];
  opportunities?: Record<string, { score: number; why: string }>;
}

const AXIS_LABELS: Record<string, string> = {
  business: "Business",
  career: "Career",
  learning: "Learning",
  content: "Content",
  investment: "Investment",
  automation: "Automation",
  startup: "Startup",
  developer: "Developer",
  freelancing: "Freelancing",
};

function scoreClass(v: number): string {
  return v >= 67 ? "news-score-high" : v >= 34 ? "news-score-mid" : "news-score-low";
}

export default async function NewsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getNewsItem(id);
  if (!item) notFound();

  const p = (item.analysis ?? {}) as AnalysisPayload;
  const axes = p.opportunities ?? {};

  return (
    <main className="news-detail">
      <a href="/feed" className="news-back">
        ← Back to news
      </a>
      <div className="news-detail-head">
        <span className="news-region">
          {regionFlag(item.region)} {regionLabel(item.region)}
        </span>
        <span className="news-date">{item.publishedAtIso?.slice(0, 10) ?? "—"}</span>
      </div>
      <h1 style={{ fontSize: "1.6rem", margin: "4px 0 8px" }}>{item.title ?? "Untitled"}</h1>

      <div className="news-detail-scores">
        {item.opportunityScore !== null && (
          <span className={`news-score ${scoreClass(item.opportunityScore)}`}>
            Opportunity {item.opportunityScore}
          </span>
        )}
        {item.impactScore !== null && <span className="news-chip">Impact {item.impactScore}</span>}
        {item.credibilityScore !== null && (
          <span className="news-chip">Credibility {item.credibilityScore}</span>
        )}
        {item.url && (
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="news-chip">
            Source ↗
          </a>
        )}
      </div>

      {item.tldr && <p className="news-detail-tldr">{item.tldr}</p>}

      {p.executiveSummary && (
        <section className="news-section">
          <h2>Executive summary</h2>
          <p>{p.executiveSummary}</p>
        </section>
      )}
      {p.whyItMatters && (
        <section className="news-section">
          <h2>Why this matters</h2>
          <p>{p.whyItMatters}</p>
        </section>
      )}

      {Object.keys(axes).length > 0 && (
        <section className="news-section">
          <h2>Opportunity breakdown</h2>
          <ul className="news-axes">
            {Object.entries(AXIS_LABELS).map(([key, label]) => {
              const a = axes[key];
              if (!a) return null;
              return (
                <li key={key} className="news-axis">
                  <div className="news-axis-head">
                    <span>{label}</span>
                    <span className={`news-score ${scoreClass(a.score)}`}>{a.score}</span>
                  </div>
                  <p className="news-axis-why">{a.why}</p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {p.actionItems && p.actionItems.length > 0 && (
        <section className="news-section">
          <h2>Action items</h2>
          <ul className="news-actions">
            {p.actionItems.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="news-detail-meta">
        {p.difficulty && (
          <span className="news-chip">Difficulty: {p.difficulty.toLowerCase()}</span>
        )}
        {p.industry && <span className="news-chip">{p.industry}</span>}
        {item.categories.map((c) => (
          <span key={c} className="news-chip">
            {c}
          </span>
        ))}
      </div>

      {p.skillsToLearn && p.skillsToLearn.length > 0 && (
        <p className="news-meta-line">
          <strong>Skills worth learning:</strong> {p.skillsToLearn.join(", ")}
        </p>
      )}
      {p.companiesAffected && p.companiesAffected.length > 0 && (
        <p className="news-meta-line">
          <strong>Companies affected:</strong> {p.companiesAffected.join(", ")}
        </p>
      )}
      {p.techMentioned && p.techMentioned.length > 0 && (
        <p className="news-meta-line">
          <strong>Technologies:</strong> {p.techMentioned.join(", ")}
        </p>
      )}
    </main>
  );
}
