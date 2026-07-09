import { getSiteUrl } from "../../lib/site";

/** Consistent JSON envelope + permissive CORS for the public read API. */
export function apiJson(data: unknown, meta: Record<string, unknown> = {}, status = 200): Response {
  return new Response(
    JSON.stringify({ data, meta: { generatedAt: new Date().toISOString(), ...meta } }, null, 2),
    {
      status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "access-control-allow-origin": "*",
        "cache-control": "public, max-age=60",
      },
    },
  );
}

export function apiError(
  code: string,
  status: number,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify({ error: code }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      ...extraHeaders,
    },
  });
}

export function trendUrl(slug: string): string {
  return `${getSiteUrl()}/trends/${slug}`;
}

/** Clamp a `?limit=` query param into a sane range. */
export function parseLimit(raw: string | null, fallback = 25, max = 100): number {
  const n = Number(raw);
  return Number.isFinite(n) ? Math.min(max, Math.max(1, Math.floor(n))) : fallback;
}

/** { dimension: value } map from a trend's scores. */
export function dimensionsOf(
  scores: { dimension: string; value: number }[],
): Record<string, number> {
  return Object.fromEntries(scores.map((s) => [s.dimension, s.value]));
}
