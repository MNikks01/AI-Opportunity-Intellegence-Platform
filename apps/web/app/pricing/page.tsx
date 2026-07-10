import type { Metadata } from "next";
import { entitlementsFor, type Entitlements } from "@aioi/database";
import {
  PLAN_PRICING,
  monthlyEquivalent,
  isBillingInterval,
  isPaidPlan,
  type BillingInterval,
} from "@aioi/billing";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple plans for the AI Opportunity Intelligence Platform. Start free; Pro unlocks unlimited watchlists, semantic search, and a 50,000/day API quota; Team adds 25 seats and 200k/day.",
};

const fmtLimit = (n: number) => (n < 0 ? "Unlimited" : n.toLocaleString());

// A feature row, rendered per tier from the plan's live entitlements.
const FEATURES: { label: string; value: (e: Entitlements) => string | boolean }[] = [
  { label: "Watchlists", value: (e) => fmtLimit(e.maxWatchlists) },
  { label: "Alert rules", value: (e) => fmtLimit(e.maxAlerts) },
  { label: "Team seats", value: (e) => fmtLimit(e.maxSeats) },
  { label: "Daily brief", value: (e) => e.dailyBrief },
  { label: "Semantic search", value: (e) => e.semanticSearch },
  { label: "API requests / day per key", value: (e) => e.apiDailyQuota.toLocaleString() },
];

type Tier = {
  plan: "FREE" | "PRO" | "TEAM";
  name: string;
  tagline: string;
  cta: string;
  featured?: boolean;
};

const TIERS: Tier[] = [
  {
    plan: "FREE",
    name: "Free",
    tagline: "Everything you need to find your next thing to build.",
    cta: "Get started →",
  },
  {
    plan: "PRO",
    name: "Pro",
    tagline: "For the solo builder shipping on AI signal, at full throughput.",
    cta: "Upgrade to Pro →",
    featured: true,
  },
  {
    plan: "TEAM",
    name: "Team",
    tagline: "For teams — 25 seats, shared watchlists, and the highest API limits.",
    cta: "Upgrade to Team →",
  },
];

// Constant across plans — the whole product surface is available on Free.
const INCLUDED = [
  "All 9 official sources — HackerNews, GitHub, Hugging Face, arXiv, npm, PyPI, YouTube, Reddit, Product Hunt",
  "Golden Quadrant (supply × demand) & momentum tracking",
  "10-dimension opportunity scores with evidence",
  "Build-kit scaffold prompts for your AI coding agent",
  "Public read API + MCP server",
  "Slack / Discord team digests & role-based access",
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

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ interval?: string }>;
}) {
  const { interval: rawInterval } = await searchParams;
  const interval: BillingInterval =
    rawInterval && isBillingInterval(rawInterval) ? rawInterval : "monthly";
  const annual = interval === "annual";

  return (
    <main className="pricing">
      <header className="pricing-head">
        <span className="pricing-eyebrow">Pricing</span>
        <h1>Start free. Upgrade when you scale.</h1>
        <p>
          The full opportunity engine is free to use. Paid plans lift the limits — unlimited
          watchlists and alerts, semantic search, more seats, and a bigger API quota.
        </p>
        <div className="pricing-toggle" role="group" aria-label="Billing interval">
          <a
            href="/pricing?interval=monthly"
            className={annual ? "" : "is-active"}
            aria-current={!annual}
          >
            Monthly
          </a>
          <a
            href="/pricing?interval=annual"
            className={annual ? "is-active" : ""}
            aria-current={annual}
          >
            Annual <span className="pricing-save">2 months free</span>
          </a>
        </div>
      </header>

      <section className="pricing-tiers pricing-tiers-3" aria-label="Plans">
        {TIERS.map((t) => {
          const ent = entitlementsFor(t.plan);
          const price = isPaidPlan(t.plan)
            ? { perMonth: monthlyEquivalent(t.plan, interval), annual: PLAN_PRICING[t.plan].annual }
            : null;
          return (
            <article key={t.plan} className={`pricing-card${t.featured ? " is-featured" : ""}`}>
              {t.featured && <span className="pricing-flag">Most popular</span>}
              <div className="pricing-card-head">
                <h2>{t.name}</h2>
                <div className="pricing-price">
                  <span className="amount">${price ? price.perMonth : 0}</span>
                  <span className="per">/month</span>
                </div>
                <p className="pricing-billed">
                  {price && annual
                    ? `billed annually — $${price.annual}/yr`
                    : price
                      ? "billed monthly"
                      : "free forever"}
                </p>
                <p className="pricing-tagline">{t.tagline}</p>
              </div>
              <a
                className={`pricing-cta ${t.featured ? "pricing-cta-primary" : "pricing-cta-ghost"}`}
                href={price ? `/billing?interval=${interval}` : "/trends"}
              >
                {t.cta}
              </a>
              <ul className="pricing-list">
                {FEATURES.map((f) => (
                  <li key={f.label}>
                    <Cell value={f.value(ent)} />
                    <span>{f.label}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
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
            <h3>How do team seats work?</h3>
            <p>
              A seat is any member or pending invite on your org. Pro includes 3; Team includes 25.
              Invites are blocked once you hit the limit — upgrade for more.
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
