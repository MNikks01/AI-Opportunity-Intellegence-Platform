import { listTrackedEntities } from "@aioi/database";
import { apiJson, apiError, parseLimit } from "../_lib";
import { apiAuth, ANON_MAX_LIMIT, AUTHED_MAX_LIMIT, rateLimitHeaders } from "../_auth";

export const dynamic = "force-dynamic";

const SORTS = new Set(["momentum", "signal", "recent"]);

/** Tracked supply-side entities (models / MCP servers / repos) with momentum. Query: sort, limit. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const auth = await apiAuth(req);
  if (auth.overQuota) return apiError("rate_limit_exceeded", 429, rateLimitHeaders(auth));
  const limit = parseLimit(
    url.searchParams.get("limit"),
    25,
    auth.authed ? AUTHED_MAX_LIMIT : ANON_MAX_LIMIT,
  );
  const sortParam = url.searchParams.get("sort") ?? "momentum";
  const sort = (SORTS.has(sortParam) ? sortParam : "momentum") as "momentum" | "signal" | "recent";

  const entities = await listTrackedEntities({ sort, limit });
  const data = entities.map((e) => ({
    name: e.name,
    type: e.type,
    signalWeight: e.signalWeight,
    linkedTrendCount: e.linkedTrendCount,
    momentum: e.momentum ? { state: e.momentum.state, delta: e.momentum.delta } : null,
  }));
  const res = apiJson(data, { count: data.length, sort, authenticated: auth.authed });
  for (const [k, v] of Object.entries(rateLimitHeaders(auth))) res.headers.set(k, v);
  return res;
}
