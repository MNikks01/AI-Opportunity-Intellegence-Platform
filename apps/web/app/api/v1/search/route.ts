import { searchTrends } from "@aioi/database";
import { apiJson, apiError, trendUrl, dimensionsOf, parseLimit } from "../_lib";
import { apiAuth, ANON_MAX_LIMIT, AUTHED_MAX_LIMIT, rateLimitHeaders } from "../_auth";

export const dynamic = "force-dynamic";

/** Public keyword search over scored trends (full-text). Query: q, limit (≤100). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const auth = await apiAuth(req);
  if (auth.overQuota) return apiError("rate_limit_exceeded", 429, rateLimitHeaders(auth));
  const q = url.searchParams.get("q")?.trim() ?? "";
  const limit = parseLimit(
    url.searchParams.get("limit"),
    25,
    auth.authed ? AUTHED_MAX_LIMIT : ANON_MAX_LIMIT,
  );

  const trends = q ? await searchTrends(q, limit) : [];
  const data = trends.map((t) => ({
    slug: t.slug,
    title: t.title,
    url: trendUrl(t.slug),
    opportunity: t.scores.find((s) => s.dimension === "opportunity")?.value ?? null,
    dimensions: dimensionsOf(t.scores),
    topIdea: t.plan?.topIdea ?? null,
  }));
  const res = apiJson(data, { count: data.length, query: q, authenticated: auth.authed });
  for (const [k, v] of Object.entries(rateLimitHeaders(auth))) res.headers.set(k, v);
  return res;
}
