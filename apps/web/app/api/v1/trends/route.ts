import { listTrendsPage } from "@aioi/database";
import { apiJson, apiError, trendUrl, dimensionsOf, parseLimit } from "../_lib";
import { apiAuth, ANON_MAX_LIMIT, AUTHED_MAX_LIMIT, rateLimitHeaders } from "../_auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const auth = await apiAuth(req);
  if (auth.overQuota) return apiError("rate_limit_exceeded", 429, rateLimitHeaders(auth));
  const limit = parseLimit(
    url.searchParams.get("limit"),
    25,
    auth.authed ? AUTHED_MAX_LIMIT : ANON_MAX_LIMIT,
  );
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
  const res = apiJson(data, {
    count: data.length,
    total: result.total,
    source: source ?? null,
    sort,
    authenticated: auth.authed,
  });
  for (const [k, v] of Object.entries(rateLimitHeaders(auth))) res.headers.set(k, v);
  return res;
}
