import { getNewsItem } from "@aioi/database";
import { apiJson, apiError } from "../../_lib";
import { apiAuth, rateLimitHeaders } from "../../_auth";

export const dynamic = "force-dynamic";

/** One news item with its full analysis payload (TLDR, 9 opportunity axes, action items, …). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiAuth(req);
  if (auth.overQuota) return apiError("rate_limit_exceeded", 429, rateLimitHeaders(auth));

  const { id } = await params;
  const item = await getNewsItem(id);
  if (!item) return apiError("not_found", 404);

  const res = apiJson(
    {
      id: item.id,
      title: item.title,
      url: item.url,
      source: item.sourceKey,
      publishedAt: item.publishedAtIso,
      region: item.region,
      language: item.language,
      tldr: item.tldr,
      opportunity: item.opportunityScore,
      impact: item.impactScore,
      credibility: item.credibilityScore,
      categories: item.categories,
      analysis: item.analysis,
    },
    { authenticated: auth.authed },
  );
  for (const [k, v] of Object.entries(rateLimitHeaders(auth))) res.headers.set(k, v);
  return res;
}
