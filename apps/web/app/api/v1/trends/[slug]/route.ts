import { getTrendBySlug, getTrendMomentumMap, getTrendEntities } from "@aioi/database";
import { apiJson, apiError, trendUrl, dimensionsOf } from "../../_lib";

export const dynamic = "force-dynamic";

interface PlanContent {
  saasIdeas?: string[];
  mvpScope?: string;
  techStack?: string[];
  pricingHint?: string;
  targetAudience?: string;
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trend = await getTrendBySlug(slug);
  if (!trend) return apiError("not_found", 404);

  const [momentumMap, entities] = await Promise.all([
    getTrendMomentumMap([trend.id]),
    getTrendEntities(trend.id),
  ]);
  const m = momentumMap.get(trend.id);
  const plan = (trend.actionPlan?.content ?? undefined) as PlanContent | undefined;

  return apiJson({
    slug: trend.slug,
    title: trend.title,
    summary: trend.summary,
    status: trend.status,
    url: trendUrl(trend.slug),
    scores: dimensionsOf(trend.scores),
    momentum:
      m && m.state !== "new" ? { state: m.state, delta: m.delta, current: m.current } : null,
    entities: entities.map((e) => ({ id: e.id, name: e.name, type: e.type })),
    plan: plan
      ? {
          topIdea: plan.saasIdeas?.[0] ?? null,
          mvpScope: plan.mvpScope ?? null,
          techStack: plan.techStack ?? null,
          pricingHint: plan.pricingHint ?? null,
          targetAudience: plan.targetAudience ?? null,
        }
      : null,
  });
}
