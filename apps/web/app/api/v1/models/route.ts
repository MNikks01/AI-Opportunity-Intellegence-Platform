import { listModelCards } from "@aioi/database";
import { apiJson } from "../_lib";
import { apiAuth, ANON_MAX_LIMIT, AUTHED_MAX_LIMIT, rateLimitHeaders } from "../_auth";
import { parseLimit } from "../_lib";

export const dynamic = "force-dynamic";

/** Open-source model tracker. Query: gguf (true), paramsMin (billions), limit (≤100). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const auth = await apiAuth(req);
  const limit = parseLimit(
    url.searchParams.get("limit"),
    25,
    auth.authed ? AUTHED_MAX_LIMIT : ANON_MAX_LIMIT,
  );
  const gguf = url.searchParams.get("gguf") === "true" ? true : undefined;
  const paramsMinRaw = Number(url.searchParams.get("paramsMin"));
  const paramsMin = Number.isFinite(paramsMinRaw) && paramsMinRaw > 0 ? paramsMinRaw : undefined;

  const models = await listModelCards({ gguf, paramsMin }, limit);
  const res = apiJson(models, { count: models.length, authenticated: auth.authed });
  for (const [k, v] of Object.entries(rateLimitHeaders(auth))) res.headers.set(k, v);
  return res;
}
