import { searchSignalsHybrid, listNews, type SignalHit } from "@aioi/database";
import { newsFilterSchema } from "@aioi/validation";
import { apiJson, apiError } from "../_lib";
import { apiAuth, ANON_MAX_LIMIT, AUTHED_MAX_LIMIT, rateLimitHeaders } from "../_auth";

export const dynamic = "force-dynamic";

function newsItemJson(h: SignalHit) {
  return {
    id: h.id,
    title: h.title,
    url: h.url,
    source: h.sourceKey,
    publishedAt: h.publishedAt?.toISOString() ?? null,
    region: h.region,
    tldr: h.tldr,
    opportunity: h.opportunityScore,
    impact: h.impactScore,
    categories: h.categories,
  };
}

/**
 * Public AI/tech news feed. Filters: q (hybrid search), region, category, minOpportunity, sinceDays,
 * sort (recent|opportunity|impact|trending), limit (≤100). With `q` it runs hybrid search; without, the
 * filtered recency feed of analyzed signals.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const auth = await apiAuth(req);
  if (auth.overQuota) return apiError("rate_limit_exceeded", 429, rateLimitHeaders(auth));

  const parsed = newsFilterSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return apiError("invalid_query", 400);
  const f = parsed.data;

  const maxLimit = auth.authed ? AUTHED_MAX_LIMIT : ANON_MAX_LIMIT;
  const limit = Math.min(f.limit, maxLimit);
  const filters = {
    region: f.region,
    categoryKey: f.category,
    minOpportunity: f.minOpportunity,
    sinceDays: f.sinceDays,
  };

  const hits = f.q
    ? await searchSignalsHybrid(f.q, filters, limit)
    : await listNews(filters, f.sort, limit);

  const data = hits.map(newsItemJson);
  const res = apiJson(data, {
    count: data.length,
    query: f.q ?? null,
    sort: f.sort,
    authenticated: auth.authed,
  });
  for (const [k, v] of Object.entries(rateLimitHeaders(auth))) res.headers.set(k, v);
  return res;
}
