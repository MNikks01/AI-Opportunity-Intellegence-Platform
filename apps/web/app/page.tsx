import { listTrendsPage, getSourceStats } from "@aioi/database";
import { Badge } from "@aioi/ui";

export const dynamic = "force-dynamic";

const PILLARS = [
  {
    n: "01",
    title: "Leading indicators, not lagging",
    text: "We read what builders ship first — repos, models, papers, packages, launches, dev chatter — the earliest signal, weeks before it becomes a search trend.",
  },
  {
    n: "02",
    title: "Supply × demand",
    text: "The Golden Quadrant crosses what's being built with what people are asking for. The build-now quadrant — high demand, low supply — is where you want to be.",
  },
  {
    n: "03",
    title: "Signal → shipped",
    text: "Every opportunity comes scored on 10 dimensions with evidence, and a ready-to-paste build plan for your AI coding agent. From weak signal to running code.",
  },
];

const FEATURES = [
  {
    icon: "📊",
    title: "Golden Quadrant",
    href: "/quadrant",
    text: "Demand × supply — see the build-now quadrant at a glance.",
  },
  {
    icon: "📈",
    title: "Momentum",
    href: "/trends?sort=opportunity",
    text: "Signal-velocity tracking — spot what's accelerating before the crowd.",
  },
  {
    icon: "🛠️",
    title: "Build kit",
    href: "/trends",
    text: "One-click scaffold prompt for Claude Code, Cursor, or v0.",
  },
  {
    icon: "🏷️",
    title: "Entities",
    href: "/entities",
    text: "The companies, models & tools that keep recurring across trends.",
  },
  {
    icon: "🔌",
    title: "API + MCP",
    href: "/api/v1",
    text: "Query opportunities from your own agent or codebase.",
  },
  {
    icon: "📨",
    title: "Team digests",
    href: "/team",
    text: "The daily brief delivered to your Slack or Discord.",
  },
];

const STEPS = [
  {
    title: "Ingest",
    text: "Pull launches, repos, models, papers, packages, videos & discussions from eight official sources — continuously.",
  },
  {
    title: "Cluster",
    text: "Group cross-source signals about the same thing into one trend, by meaning (embeddings).",
  },
  {
    title: "Score",
    text: "Rate each trend on 10 opportunity dimensions with evidence-grounded rationale.",
  },
  {
    title: "Plan",
    text: "Auto-generate a build plan: SaaS/API ideas, MVP scope, pricing, names, tech stack.",
  },
  { title: "Ship", text: "Export a rigorous scaffold prompt and hand it to your AI coding agent." },
];

const SOURCES = [
  "HackerNews",
  "GitHub",
  "Hugging Face",
  "arXiv",
  "npm",
  "YouTube",
  "Reddit",
  "Product Hunt",
];

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
        <h1 className="home-title">See what to build before it&rsquo;s a trend.</h1>
        <p className="home-sub">
          We watch where AI ships first — repos, models, papers, launches — detect what&rsquo;s
          breaking out before it&rsquo;s a search trend, score the opportunity, and hand you a
          buildable plan.
        </p>
        <div className="home-cta">
          <a className="home-btn home-btn-primary" href="/trends">
            Browse trends →
          </a>
          <a className="home-btn" href="/quadrant">
            See the Golden Quadrant
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

      <section className="home-section">
        <div className="home-pillars">
          {PILLARS.map((p) => (
            <div key={p.n} className="home-pillar">
              <div className="n">{p.n}</div>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </div>
          ))}
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

      <section className="home-section">
        <h2>Everything you need to go from signal to shipped</h2>
        <div className="home-features">
          {FEATURES.map((f) => (
            <a key={f.title} href={f.href} className="home-feature">
              <div className="icon" aria-hidden>
                {f.icon}
              </div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="home-section" id="how">
        <h2>How it works</h2>
        <div className="home-steps">
          {STEPS.map((s, i) => (
            <div key={s.title} className="home-step">
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
        <div className="home-cta" style={{ justifyContent: "center" }}>
          <a className="home-btn home-btn-primary" href="/trends">
            Browse all trends →
          </a>
          <a className="home-btn" href="/api/v1">
            Read the API
          </a>
        </div>
      </section>
    </main>
  );
}
