import { getTrendBySlug } from "@aioi/database";
import { Badge, Card, Scorecard } from "@aioi/ui";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

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

  return (
    <main>
      <a href="/trends" style={{ color: "var(--fg-muted)", fontSize: "0.875rem" }}>
        ← Trends
      </a>
      <h1 style={{ fontSize: "1.75rem", margin: "8px 0 4px" }}>{trend.title}</h1>
      {trend.summary && (
        <p style={{ color: "var(--fg-muted)", margin: "0 0 20px", maxWidth: 640 }}>
          {trend.summary}
        </p>
      )}
      <div style={{ maxWidth: 560 }}>
        <Scorecard scores={trend.scores} />
      </div>

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
