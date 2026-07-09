import { listTrendsQuadrant } from "@aioi/database";
import { apiJson, trendUrl, parseLimit } from "../_lib";
import { apiAuth, ANON_MAX_LIMIT, AUTHED_MAX_LIMIT } from "../_auth";

export const dynamic = "force-dynamic";

/** The Golden-Quadrant "build now" list: high demand, low supply — ranked by opportunity. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const { authed } = await apiAuth(req);
  const limit = parseLimit(
    url.searchParams.get("limit"),
    25,
    authed ? AUTHED_MAX_LIMIT : ANON_MAX_LIMIT,
  );

  const all = await listTrendsQuadrant(300);
  const build = all
    .filter((t) => t.quadrant === "build")
    .sort((a, b) => (b.opportunity ?? 0) - (a.opportunity ?? 0))
    .slice(0, limit);

  const data = build.map((t) => ({
    slug: t.slug,
    title: t.title,
    url: trendUrl(t.slug),
    opportunity: t.opportunity,
    demand: t.demand,
    supply: t.supply,
    demandSignals: t.demandSignals,
  }));
  return apiJson(data, { count: data.length, quadrant: "build", authenticated: authed });
}
