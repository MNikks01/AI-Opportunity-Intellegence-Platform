import type { Metadata } from "next";
import { entitlementsFor, type Entitlements } from "@aioi/database";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple plans for the AI Opportunity Intelligence Platform. Start free; upgrade to Pro for unlimited watchlists, semantic search, and a 50,000/day API quota.",
};

const free = entitlementsFor("FREE");
const pro = entitlementsFor("PRO");

const fmtLimit = (n: number) => (n < 0 ? "Unlimited" : n.toLocaleString());

type Row = {
  label: string;
  free: (e: Entitlements) => string | boolean;
  pro: (e: Entitlements) => string | boolean;
};

// Entitlement-driven rows — the single source of truth is @aioi/billing.
const ROWS: Row[] = [
  {
    label: "Watchlists",
    free: (e) => fmtLimit(e.maxWatchlists),
    pro: (e) => fmtLimit(e.maxWatchlists),
  },
  { label: "Alert rules", free: (e) => fmtLimit(e.maxAlerts), pro: (e) => fmtLimit(e.maxAlerts) },
  { label: "Daily brief", free: (e) => e.dailyBrief, pro: (e) => e.dailyBrief },
  { label: "Semantic search", free: (e) => e.semanticSearch, pro: (e) => e.semanticSearch },
  {
    label: "API requests / day per key",
    free: (e) => `${e.apiDailyQuota.toLocaleString()}`,
    pro: (e) => `${e.apiDailyQuota.toLocaleString()}`,
  },
];

// Constant across plans — the whole product surface is available on Free.
const INCLUDED = [
  "All 8 official sources — HackerNews, GitHub, Hugging Face, arXiv, npm, YouTube, Reddit, Product Hunt",
  "Golden Quadrant (supply × demand) & momentum tracking",
  "10-dimension opportunity scores with evidence",
  "Build-kit scaffold prompts for your AI coding agent",
  "Public read API + MCP server",
  "Slack / Discord team digests & seat-based collaboration",
];

function Cell({ value }: { value: string | boolean }) {
  if (value === true)
    return (
      <span className="pricing-yes" aria-label="Included">
        ✓
      </span>
    );
  if (value === false)
    return (
      <span className="pricing-no" aria-label="Not included">
        —
      </span>
    );
  return <span>{value}</span>;
}

export default function PricingPage() {
  return (
    <main className="pricing">
      <header className="pricing-head">
        <span className="pricing-eyebrow">Pricing</span>
        <h1>Start free. Upgrade when you scale.</h1>
        <p>
          The full opportunity engine is free to use. Pro removes the limits — unlimited watchlists
          and alerts, semantic search, and a {pro.apiDailyQuota.toLocaleString()}/day API quota.
        </p>
      </header>

      <section className="pricing-tiers" aria-label="Plans">
        <article className="pricing-card">
          <div className="pricing-card-head">
            <h2>Free</h2>
            <div className="pricing-price">
              <span className="amount">$0</span>
              <span className="per">/month</span>
            </div>
            <p className="pricing-tagline">Everything you need to find your next thing to build.</p>
          </div>
          <a className="pricing-cta pricing-cta-ghost" href="/trends">
            Get started →
          </a>
          <ul className="pricing-list">
            {ROWS.map((r) => (
              <li key={r.label}>
                <Cell value={r.free(free)} />
                <span>{r.label}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="pricing-card is-featured">
          <span className="pricing-flag">Recommended</span>
          <div className="pricing-card-head">
            <h2>Pro</h2>
            <div className="pricing-price">
              <span className="amount">$29</span>
              <span className="per">/month</span>
            </div>
            <p className="pricing-tagline">For teams shipping on AI signal, at full throughput.</p>
          </div>
          <a className="pricing-cta pricing-cta-primary" href="/billing">
            Upgrade to Pro →
          </a>
          <ul className="pricing-list">
            {ROWS.map((r) => (
              <li key={r.label}>
                <Cell value={r.pro(pro)} />
                <span>{r.label}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="pricing-included">
        <h2>Included in every plan</h2>
        <ul>
          {INCLUDED.map((f) => (
            <li key={f}>
              <span className="pricing-yes" aria-hidden>
                ✓
              </span>
              {f}
            </li>
          ))}
        </ul>
      </section>

      <section className="pricing-faq">
        <h2>Questions</h2>
        <div className="pricing-faq-grid">
          <div>
            <h3>Do I need a card to start?</h3>
            <p>
              No. Free is genuinely free — no card, no trial clock. Upgrade only when the limits
              bite.
            </p>
          </div>
          <div>
            <h3>What counts against the API quota?</h3>
            <p>
              Each authenticated request to the public read API, per key, per UTC day. Anonymous
              requests are capped separately. Responses carry <code>X-RateLimit-*</code> headers.
            </p>
          </div>
          <div>
            <h3>Can I change plans later?</h3>
            <p>
              Anytime, from <a href="/billing">Billing</a>. Entitlements apply immediately — no
              proration surprises.
            </p>
          </div>
          <div>
            <h3>Where do the numbers come from?</h3>
            <p>
              Every limit on this page is read live from the plan&rsquo;s entitlements — what you
              see is what enforces.
            </p>
          </div>
        </div>
      </section>

      <section className="pricing-final">
        <h2>Find your next thing to build.</h2>
        <div className="pricing-final-cta">
          <a className="pricing-cta pricing-cta-primary" href="/trends">
            Browse trends →
          </a>
          <a className="pricing-cta pricing-cta-ghost" href="/billing">
            Manage plan
          </a>
        </div>
      </section>
    </main>
  );
}
