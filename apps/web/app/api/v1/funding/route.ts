import { listRecentFunding } from "@aioi/database";
import { apiJson, apiError, trendUrl, parseLimit } from "../_lib";
import { apiAuth, ANON_MAX_LIMIT, AUTHED_MAX_LIMIT, rateLimitHeaders } from "../_auth";

export const dynamic = "force-dynamic";

/** Recent AI funding events (SEC EDGAR Form D + Crunchbase) with the trends each maps to. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const auth = await apiAuth(req);
  if (auth.overQuota) return apiError("rate_limit_exceeded", 429, rateLimitHeaders(auth));
  const limit = parseLimit(
    url.searchParams.get("limit"),
    25,
    auth.authed ? AUTHED_MAX_LIMIT : ANON_MAX_LIMIT,
  );

  const events = await listRecentFunding(limit);
  const data = events.map((e) => ({
    issuer: e.issuer,
    filedAt: e.filedAt ? e.filedAt.toISOString().slice(0, 10) : null,
    url: e.url,
    trends: e.trends.map((t) => ({ slug: t.slug, title: t.title, url: trendUrl(t.slug) })),
  }));
  const res = apiJson(data, { count: data.length, authenticated: auth.authed });
  for (const [k, v] of Object.entries(rateLimitHeaders(auth))) res.headers.set(k, v);
  return res;
}
