import { listTrendsPage, getSourceStats } from "@aioi/database";
import { Badge } from "@aioi/ui";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    icon: "📡",
    title: "Ingest",
    text: "Pull launches, repos, models, videos, and discussions from six official sources — continuously.",
  },
  {
    icon: "🧩",
    title: "Cluster",
    text: "Group cross-source signals about the same thing into a single trend, by meaning (embeddings).",
  },
  {
    icon: "📊",
    title: "Score",
    text: "Rate each trend on 10 opportunity dimensions with evidence-grounded rationale.",
  },
  {
    icon: "🛠️",
    title: "Plan",
    text: "Auto-generate a build plan: SaaS/API ideas, MVP scope, pricing, names, and tech stack.",
  },
];

const SOURCES = ["HackerNews", "GitHub", "Hugging Face", "YouTube", "Reddit", "Product Hunt"];

export default async function Home() {
  const [{ trends, total }, sources] = await Promise.all([
    listTrendsPage({ sort: "opportunity", pageSize: 3 }),
    getSourceStats(),
  ]);
  const signalCount = sources.reduce((n, s) => n + s.signalCount, 0);
  const liveSources = sources.filter((s) => s.signalCount > 0).length;

  return (
    <main className="home">
      <section className="home-hero">
        <span className="home-eyebrow">◧ AI Opportunity Intelligence</span>
        <h1 className="home-title">Discover AI opportunities before everyone else.</h1>
        <p className="home-sub">
          We continuously scan the AI ecosystem, cluster what&rsquo;s emerging, score the
          opportunity, and hand you a concrete plan to build on it.
        </p>
        <div className="home-cta">
          <a className="home-btn home-btn-primary" href="/trends">
            Browse trends →
          </a>
          <a className="home-btn" href="#how">
            How it works
          </a>
        </div>
        <div className="home-stats">
          <span>
            <strong>{total.toLocaleString()}</strong> scored trends
          </span>
          <span>
            <strong>{signalCount.toLocaleString()}</strong> signals
          </span>
          <span>
            <strong>{liveSources}</strong> live sources
          </span>
        </div>
      </section>

      {trends.length > 0 && (
        <section className="home-section">
          <div className="home-section-head">
            <h2>Top opportunities right now</h2>
            <a href="/trends?sort=opportunity" className="home-link">
              View all →
            </a>
          </div>
          <div className="home-grid">
            {trends.map((t) => {
              const opp = t.scores.find((s) => s.dimension === "opportunity");
              return (
                <a key={t.slug} href={`/trends/${t.slug}`} className="home-trend">
                  <div className="home-trend-head">
                    <strong>{t.title}</strong>
                    {opp && <Badge band={opp.band}>{opp.value}</Badge>}
                  </div>
                  {t.plan?.topIdea && <p className="home-trend-idea">💡 {t.plan.topIdea}</p>}
                </a>
              );
            })}
          </div>
        </section>
      )}

      <section className="home-section" id="how">
        <h2>How it works</h2>
        <div className="home-steps">
          {STEPS.map((s, i) => (
            <div key={s.title} className="home-step">
              <div className="home-step-icon" aria-hidden>
                {s.icon}
              </div>
              <h3>
                <span className="home-step-num">{i + 1}</span> {s.title}
              </h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="home-section">
        <h2>Official sources only</h2>
        <p className="home-muted">
          Every connector is legality-classified — official or licensed APIs, no ToS-violating
          scraping.
        </p>
        <div className="home-sources">
          {SOURCES.map((s) => (
            <Badge key={s}>{s}</Badge>
          ))}
        </div>
      </section>

      <section className="home-final">
        <h2>Find your next thing to build.</h2>
        <a className="home-btn home-btn-primary" href="/trends">
          Browse all trends →
        </a>
      </section>
    </main>
  );
}
