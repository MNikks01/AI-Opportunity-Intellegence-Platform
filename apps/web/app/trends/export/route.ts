import { listTrendsPage, searchTrends, type TrendView } from "@aioi/database";
import { SCORE_DIMENSIONS, type ScoreDimension } from "@aioi/shared";

export const dynamic = "force-dynamic";

/** snake_case column header for a dimension (predictedLifetime → predicted_lifetime). */
const snake = (d: ScoreDimension) => d.replace(/([A-Z])/g, "_$1").toLowerCase();

/** All trends matching the current filters (search, or paged browse up to a cap). */
async function collect(p: {
  q?: string;
  source?: string;
  status?: string;
  sort?: string;
}): Promise<TrendView[]> {
  if (p.q) return searchTrends(p.q, 500);
  const out: TrendView[] = [];
  for (let page = 1; page <= 20; page++) {
    const r = await listTrendsPage({
      source: p.source,
      status: p.status,
      sort: p.sort,
      page,
      pageSize: 60,
    });
    out.push(...r.trends);
    if (page >= r.pageCount) break;
  }
  return out;
}

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const format = url.searchParams.get("format") === "json" ? "json" : "csv";
  const trends = await collect({
    q: url.searchParams.get("q")?.trim() || undefined,
    source: url.searchParams.get("source")?.trim() || undefined,
    status: url.searchParams.get("status")?.trim() || undefined,
    sort: url.searchParams.get("sort")?.trim() || undefined,
  });

  const rows = trends.map((t) => {
    const byDim = new Map(t.scores.map((s) => [s.dimension, s.value]));
    const dims = Object.fromEntries(SCORE_DIMENSIONS.map((d) => [snake(d), byDim.get(d) ?? ""]));
    return {
      title: t.title,
      status: t.status,
      ...dims,
      topIdea: t.plan?.topIdea ?? "",
      url: `/trends/${t.slug}`,
    };
  });

  const date = new Date().toISOString().slice(0, 10);
  if (format === "json") {
    return new Response(JSON.stringify(rows, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="trends-${date}.json"`,
      },
    });
  }

  const header = ["title", "status", ...SCORE_DIMENSIONS.map(snake), "topIdea", "url"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(header.map((h) => csvCell((r as Record<string, unknown>)[h])).join(","));
  }
  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="trends-${date}.csv"`,
    },
  });
}
