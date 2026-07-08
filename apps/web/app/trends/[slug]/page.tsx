import {
  getTrendBySlug,
  getTrendResources,
  listWatchlists,
  getTrendEntities,
  getRelatedTrends,
} from "@aioi/database";
import { Badge, Card, Scorecard } from "@aioi/ui";
import { notFound } from "next/navigation";
import { ResourceItem } from "./ResourceItem";
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

export default async function TrendDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trend = await getTrendBySlug(slug);
  if (!trend) notFound();
  const plan = trend.actionPlan?.content as ActionPlan | undefined;
  const { organizationId } = await getDevOrg();
  const [resources, watchlists, entities, related] = await Promise.all([
    getTrendResources(trend.id),
    listWatchlists(organizationId),
    getTrendEntities(trend.id),
    getRelatedTrends(trend.id, 6),
  ]);
  const sourceCount = new Set(resources.map((r) => r.source)).size;
  // Sub-dimension rationales (opportunity's rationale already leads the scorecard).
  const rationales = trend.scores.filter((s) => s.dimension !== "opportunity" && s.rationale);

  return (
    <main>
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

      <div style={{ maxWidth: 560 }}>
        <Scorecard scores={trend.scores} />
      </div>

      {related.length > 0 && (
        <>
          <h2 style={{ fontSize: "1.25rem", margin: "32px 0 8px" }}>Related trends</h2>
          <p style={{ color: "var(--fg-muted)", fontSize: "0.8125rem", margin: "0 0 12px" }}>
            Trends that share entities with this one.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {related.map((r) => (
              <a key={r.slug} href={`/trends/${r.slug}`} className="entity-trend">
                <span>{r.title}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "var(--fg-muted)", fontSize: "0.75rem" }}>
                    {r.shared} shared
                  </span>
                  {r.opportunity !== null && r.band && <Badge band={r.band}>{r.opportunity}</Badge>}
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
    </main>
  );
}
