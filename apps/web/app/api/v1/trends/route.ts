import { listTrendsPage } from "@aioi/database";
import { apiJson, trendUrl, dimensionsOf, parseLimit } from "../_lib";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = parseLimit(url.searchParams.get("limit"));
  const source = url.searchParams.get("source")?.trim() || undefined;
  const sort = url.searchParams.get("sort")?.trim() || "opportunity";

  const result = await listTrendsPage({ source, sort, page: 1, pageSize: limit });
  const data = result.trends.map((t) => ({
    slug: t.slug,
    title: t.title,
    url: trendUrl(t.slug),
    opportunity: t.scores.find((s) => s.dimension === "opportunity")?.value ?? null,
    dimensions: dimensionsOf(t.scores),
    topIdea: t.plan?.topIdea ?? null,
  }));
  return apiJson(data, { count: data.length, total: result.total, source: source ?? null, sort });
}
