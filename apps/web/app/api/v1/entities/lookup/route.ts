import { lookupTrackedEntity } from "@aioi/database";
import { apiJson, apiError, trendUrl } from "../../_lib";
import { apiAuth, rateLimitHeaders } from "../../_auth";

export const dynamic = "force-dynamic";

/** Look up a tracked entity (model / MCP / repo) by exact name — used by the extension content script. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const auth = await apiAuth(req);
  if (auth.overQuota) return apiError("rate_limit_exceeded", 429, rateLimitHeaders(auth));
  const name = url.searchParams.get("name")?.trim() ?? "";
  if (!name) return apiError("missing_name", 400, rateLimitHeaders(auth));

  const entity = await lookupTrackedEntity(name);
  if (!entity) return apiError("entity_not_found", 404, rateLimitHeaders(auth));

  const res = apiJson({
    name: entity.name,
    type: entity.type,
    linkedTrendCount: entity.linkedTrendCount,
    momentum: entity.momentum
      ? { state: entity.momentum.state, delta: entity.momentum.delta }
      : null,
    trends: entity.trends.map((t) => ({ slug: t.slug, title: t.title, url: trendUrl(t.slug) })),
  });
  for (const [k, v] of Object.entries(rateLimitHeaders(auth))) res.headers.set(k, v);
  return res;
}
