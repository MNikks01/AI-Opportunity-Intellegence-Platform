import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import {
  createTrendFromSignalIds,
  ensureSource,
  getTrendResources,
  getTrendsByIds,
  listTrendsPage,
  prisma,
} from "./index";

const enabled = Boolean(process.env.DATABASE_URL);
const sourceKey = `ltp-test-${randomUUID().slice(0, 8)}`;
const created: string[] = [];

describe.skipIf(!enabled)("listTrendsPage (integration)", () => {
  afterAll(async () => {
    for (const id of created) await prisma.trend.delete({ where: { id } }).catch(() => {});
    await prisma.source.deleteMany({ where: { key: sourceKey } }).catch(() => {});
  });

  it("filters by source + status, sorts by any dimension, and paginates without overlap", async () => {
    const sourceId = await ensureSource(sourceKey);
    const [a, b] = await Promise.all([
      prisma.signal.create({ data: { sourceId, externalId: "a", title: "alpha agent", url: "https://example.com/a", raw: {} } }), // prettier-ignore
      prisma.signal.create({ data: { sourceId, externalId: "b", title: "beta agent", raw: {} } }),
    ]);
    const t1 = await createTrendFromSignalIds([a.id], "Alpha trend");
    const t2 = await createTrendFromSignalIds([b.id], "Beta trend");
    created.push(t1, t2);
    // t1: high opportunity / low business + ACTIVE; t2: low opportunity / high business + EARLY.
    await prisma.trend.update({ where: { id: t1 }, data: { status: "ACTIVE" } });
    await prisma.score.createMany({
      data: [
        { trendId: t1, dimension: "OPPORTUNITY", value: 90, band: "HIGH", confidence: 0.8, rationale: "x", evidence: [], rubricVersion: "test" }, // prettier-ignore
        { trendId: t1, dimension: "BUSINESS", value: 20, band: "LOW", confidence: 0.8, rationale: "x", evidence: [], rubricVersion: "test" }, // prettier-ignore
        { trendId: t2, dimension: "OPPORTUNITY", value: 10, band: "LOW", confidence: 0.8, rationale: "x", evidence: [], rubricVersion: "test" }, // prettier-ignore
        { trendId: t2, dimension: "BUSINESS", value: 80, band: "HIGH", confidence: 0.8, rationale: "x", evidence: [], rubricVersion: "test" }, // prettier-ignore
      ],
    });

    // source filter — our two trends
    expect((await listTrendsPage({ source: sourceKey, pageSize: 100 })).total).toBe(2);

    // status filter — only the ACTIVE one
    const active = await listTrendsPage({ source: sourceKey, status: "ACTIVE", pageSize: 100 });
    expect(active.total).toBe(1);
    expect(active.trends[0]!.id).toBe(t1);

    // sort by opportunity → t1 first; sort by business → t2 first (different dimension flips order)
    const byOpp = await listTrendsPage({ source: sourceKey, sort: "opportunity", pageSize: 100 });
    expect(byOpp.trends.map((t) => t.id)).toEqual([t1, t2]);
    const byBiz = await listTrendsPage({ source: sourceKey, sort: "business", pageSize: 100 });
    expect(byBiz.trends.map((t) => t.id)).toEqual([t2, t1]);

    // pagination — pageSize 1 → 2 pages, no overlap
    const p1 = await listTrendsPage({
      source: sourceKey,
      sort: "opportunity",
      page: 1,
      pageSize: 1,
    });
    const p2 = await listTrendsPage({
      source: sourceKey,
      sort: "opportunity",
      page: 2,
      pageSize: 1,
    });
    expect(p1.pageCount).toBe(2);
    expect(p1.trends[0]!.id).toBe(t1);
    expect(p2.trends[0]!.id).toBe(t2);

    // resources — the source item(s) with source key + link
    const res = await getTrendResources(t1);
    expect(res).toHaveLength(1);
    expect(res[0]!.source).toBe(sourceKey);
    expect(res[0]!.url).toBe("https://example.com/a");
    expect(res[0]!.title).toBe("alpha agent");

    // getTrendsByIds — resolve watchlist trend items to slug/title/opportunity
    const byId = await getTrendsByIds([t1, t2]);
    expect(byId.get(t1)?.title).toBe("Alpha trend");
    expect(byId.get(t1)?.opportunity).toBe(90);
    expect(byId.get(t2)?.opportunity).toBe(10);
    expect(byId.get(t1)?.slug).toMatch(/^alpha-trend/);
  });
});
