import {
  getTrendBySlug,
  getTrendResources,
  listWatchlists,
  getTrendEntities,
  getRelatedTrends,
  relatedTrends,
  getTrendMomentumMap,
} from "@aioi/database";
import { Badge, Card, Scorecard, Sparkline } from "@aioi/ui";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { buildScaffoldPrompt, bandForValue } from "@aioi/shared";
import { getTrendSeo } from "@aioi/database";
import { getSiteUrl } from "../../lib/site";
import { ResourceItem } from "./ResourceItem";
import { ScaffoldBlock } from "./ScaffoldBlock";
import { getDevOrg } from "../../lib/dev-org";
import { watchTrendAction } from "../../watchlists/actions";
import { TYPE_LABELS } from "../../entities/page";

export const dynamic = "force-dynamic";

const DIM_LABELS: Record<string, string> = {
  opportunity: "Opportunity",
  business: "Business",
  developer: "Developer",
  creator: "Creator",
  seo: "SEO",
  competition: "Competition",
  monetization: "Monetization",
  risk: "Risk",
  difficulty: "Difficulty",
  predicted_lifetime: "Predicted lifetime",
};

type ActionPlan = {
  saasIdeas: string[];
  apiIdeas: string[];
  contentIdeas: string[];
  keywords: string[];
  domainNames: string[];
  productNames: string[];
  targetAudience: string;
  pricingHint: string;
  mvpScope: string;
  techStack: string[];
};

function List({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 600, fontSize: "0.9375rem" }}>{title}</div>
      <ul style={{ margin: "6px 0 0", paddingLeft: 18, color: "var(--fg-muted)" }}>
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

function Chips({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 600, fontSize: "0.9375rem", marginBottom: 6 }}>{title}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.map((it, i) => (
          <Badge key={i}>{it}</Badge>
        ))}
      </div>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const seo = await getTrendSeo(slug);
  if (!seo) return { title: "Trend not found", robots: { index: false } };
  const description =
    seo.summary?.slice(0, 155) ||
    `Opportunity analysis for “${seo.title}” — scored across 10 dimensions, with related entities and a build plan.`;
  const url = `${getSiteUrl()}/trends/${slug}`;
  return {
    title: seo.title,
    description,
    alternates: { canonical: url },
    openGraph: { title: seo.title, description, url, type: "article" },
    twitter: { title: seo.title, description },
  };
}

export default async function TrendDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trend = await getTrendBySlug(slug);
  if (!trend) notFound();
  const plan = trend.actionPlan?.content as ActionPlan | undefined;
  const { organizationId } = await getDevOrg();
  const [resources, watchlists, entities, related, semantic, momentumMap] = await Promise.all([
    getTrendResources(trend.id),
    listWatchlists(organizationId),
    getTrendEntities(trend.id),
    getRelatedTrends(trend.id, 6),
    relatedTrends(trend.id, 6),
    getTrendMomentumMap([trend.id]),
  ]);
  const momentum = momentumMap.get(trend.id);

  // "Related opportunities": explicit shared-entity matches first, then fill with embedding-similar
  // trends (broader recall for sparsely-tagged trends), deduped, capped at 6.
  const relatedSlugs = new Set(related.map((r) => r.slug));
  const relatedList: { slug: string; title: string; opportunity: number | null; reason: string }[] =
    [
      ...related.map((r) => ({
        slug: r.slug,
        title: r.title,
        opportunity: r.opportunity,
        reason: `${r.shared} shared`,
      })),
      ...semantic
        .filter((t) => t.slug !== slug && !relatedSlugs.has(t.slug))
        .map((t) => ({
          slug: t.slug,
          title: t.title,
          opportunity: t.scores.find((s) => s.dimension === "opportunity")?.value ?? null,
          reason: "similar",
        })),
    ].slice(0, 6);
  const sourceCount = new Set(resources.map((r) => r.source)).size;
  // Sub-dimension rationales (opportunity's rationale already leads the scorecard).
  const rationales = trend.scores.filter((s) => s.dimension !== "opportunity" && s.rationale);

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: trend.title,
            ...(trend.summary ? { description: trend.summary } : {}),
            url: `${getSiteUrl()}/trends/${slug}`,
          }),
        }}
      />
      <a href="/trends" style={{ color: "var(--fg-muted)", fontSize: "0.875rem" }}>
        ← Trends
      </a>
      <h1 style={{ fontSize: "1.75rem", margin: "8px 0 4px" }}>{trend.title}</h1>
      {trend.summary && (
        <p style={{ color: "var(--fg-muted)", margin: "0 0 8px", maxWidth: 640 }}>
          {trend.summary}
        </p>
      )}
      <p className="trend-meta">
        Backed by {resources.length} {resources.length === 1 ? "signal" : "signals"} across{" "}
        {sourceCount} {sourceCount === 1 ? "source" : "sources"}.
      </p>

      {watchlists.length > 0 ? (
        <form action={watchTrendAction} className="watch-form">
          <input type="hidden" name="trendId" value={trend.id} />
          <label className="watch-label" htmlFor="watch-select">
            + Add to watchlist
          </label>
          <select id="watch-select" name="watchlistId" className="watch-select">
            {watchlists.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <button type="submit" className="watch-btn">
            Add
          </button>
        </form>
      ) : (
        <p className="trend-meta">
          <a href="/watchlists" style={{ color: "var(--primary)" }}>
            Create a watchlist
          </a>{" "}
          to track this trend and get alerts.
        </p>
      )}

      {entities.length > 0 && (
        <div className="trend-entities">
          <span className="trend-entities-label">Entities:</span>
          {entities.map((e) => (
            <a key={e.id} href={`/entities/${e.id}`} className="trend-entity-chip">
              {e.name}
              <span className="trend-entity-type">{TYPE_LABELS[e.type] ?? e.type}</span>
            </a>
          ))}
        </div>
      )}

      {momentum && momentum.state !== "new" && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 16,
            padding: "12px 16px",
            border: "1px solid var(--border)",
            borderRadius: 12,
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.6875rem",
                color: "var(--fg-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 3,
              }}
            >
              Momentum
            </div>
            <div
              style={{
                fontSize: "0.95rem",
                fontWeight: 700,
                color: momentum.state === "accelerating" ? "#26a269" : "var(--fg)",
              }}
            >
              {momentum.state === "accelerating"
                ? "Accelerating"
                : momentum.state === "cooling"
                  ? "Cooling"
                  : "Steady"}
            </div>
          </div>
          <Sparkline
            data={momentum.spark}
            width={120}
            height={34}
            color={momentum.state === "accelerating" ? "#26a269" : "var(--fg-muted)"}
          />
          <div style={{ fontSize: "0.8125rem", color: "var(--fg-muted)" }}>
            {momentum.delta >= 0 ? "+" : ""}
            {momentum.delta} signals · 7d
            {momentum.pct !== null ? ` · ${momentum.pct >= 0 ? "+" : ""}${momentum.pct}%` : ""}
          </div>
        </div>
      )}

      <div style={{ maxWidth: 560 }}>
        <Scorecard scores={trend.scores} />
      </div>

      {relatedList.length > 0 && (
        <>
          <h2 style={{ fontSize: "1.25rem", margin: "32px 0 8px" }}>Related opportunities</h2>
          <p style={{ color: "var(--fg-muted)", fontSize: "0.8125rem", margin: "0 0 12px" }}>
            Trends that share entities with this one, plus others that are semantically similar.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {relatedList.map((r) => (
              <a key={r.slug} href={`/trends/${r.slug}`} className="entity-trend">
                <span>{r.title}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "var(--fg-muted)", fontSize: "0.75rem" }}>{r.reason}</span>
                  {r.opportunity !== null && (
                    <Badge band={bandForValue(r.opportunity)}>{r.opportunity}</Badge>
                  )}
                </span>
              </a>
            ))}
          </div>
        </>
      )}

      <h2 style={{ fontSize: "1.25rem", margin: "32px 0 8px" }}>Sources &amp; resources</h2>
      {resources.length > 0 ? (
        <Card>
          <ul className="resource-list">
            {resources.map((r) => (
              <ResourceItem key={r.id} r={r} />
            ))}
          </ul>
        </Card>
      ) : (
        <div className="aioi-card" style={{ color: "var(--fg-muted)" }}>
          No source items linked to this trend yet.
        </div>
      )}

      {rationales.length > 0 && (
        <>
          <h2 style={{ fontSize: "1.25rem", margin: "32px 0 8px" }}>Scoring rationale</h2>
          <Card>
            {rationales.map((s) => (
              <div key={s.dimension} className="rationale-row">
                <div className="rationale-head">
                  <strong>{DIM_LABELS[s.dimension] ?? s.dimension}</strong>
                  <Badge band={s.band}>{s.value}</Badge>
                </div>
                <p className="rationale-text">{s.rationale}</p>
              </div>
            ))}
          </Card>
        </>
      )}

      <h2 style={{ fontSize: "1.25rem", margin: "32px 0 8px" }}>Action plan</h2>
      {plan ? (
        <Card>
          <List title="SaaS ideas" items={plan.saasIdeas} />
          <List title="API ideas" items={plan.apiIdeas} />
          <List title="Content ideas" items={plan.contentIdeas} />
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 600, fontSize: "0.9375rem" }}>MVP scope</div>
            <p style={{ margin: "6px 0 0", color: "var(--fg-muted)" }}>{plan.mvpScope}</p>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 600, fontSize: "0.9375rem" }}>Target audience</div>
            <p style={{ margin: "6px 0 0", color: "var(--fg-muted)" }}>{plan.targetAudience}</p>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 600, fontSize: "0.9375rem" }}>Pricing</div>
            <p style={{ margin: "6px 0 0", color: "var(--fg-muted)" }}>{plan.pricingHint}</p>
          </div>
          <Chips title="Product names" items={plan.productNames} />
          <Chips title="Domains" items={plan.domainNames} />
          <Chips title="Keywords" items={plan.keywords} />
          <Chips title="Tech stack" items={plan.techStack} />
        </Card>
      ) : (
        <div className="aioi-card" style={{ color: "var(--fg-muted)" }}>
          No action plan generated yet.
        </div>
      )}

      {plan && (
        <>
          <h2 style={{ fontSize: "1.25rem", margin: "32px 0 4px" }}>🛠 Build kit</h2>
          <p style={{ color: "var(--fg-muted)", fontSize: "0.8125rem", margin: "0 0 12px" }}>
            One step from opportunity to code — a scaffold prompt assembled from this plan.
          </p>
          <ScaffoldBlock
            prompt={buildScaffoldPrompt({ title: trend.title, summary: trend.summary, plan })}
            filename={`${slug}-scaffold.md`}
          />
        </>
      )}
    </main>
  );
}
