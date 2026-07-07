import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createTrendFromSignalIds, ensureSource, listTrendsPage, prisma } from "./index";

const enabled = Boolean(process.env.DATABASE_URL);
const sourceKey = `ltp-test-${randomUUID().slice(0, 8)}`;
const created: string[] = [];

describe.skipIf(!enabled)("listTrendsPage (integration)", () => {
  afterAll(async () => {
    for (const id of created) await prisma.trend.delete({ where: { id } }).catch(() => {});
    await prisma.source.deleteMany({ where: { key: sourceKey } }).catch(() => {});
  });

  it("filters by source, sorts by opportunity score, and paginates without overlap", async () => {
    const sourceId = await ensureSource(sourceKey);
    const [a, b] = await Promise.all([
      prisma.signal.create({ data: { sourceId, externalId: "a", title: "alpha agent", raw: {} } }),
      prisma.signal.create({ data: { sourceId, externalId: "b", title: "beta agent", raw: {} } }),
    ]);
    const t1 = await createTrendFromSignalIds([a.id], "Alpha trend");
    const t2 = await createTrendFromSignalIds([b.id], "Beta trend");
    created.push(t1, t2);
    await prisma.score.createMany({
      data: [
        { trendId: t1, dimension: "OPPORTUNITY", value: 90, band: "HIGH", confidence: 0.8, rationale: "x", evidence: [], rubricVersion: "test" }, // prettier-ignore
        { trendId: t2, dimension: "OPPORTUNITY", value: 10, band: "LOW", confidence: 0.8, rationale: "x", evidence: [], rubricVersion: "test" }, // prettier-ignore
      ],
    });

    // filter by source — only our two trends
    expect((await listTrendsPage({ source: sourceKey, pageSize: 100 })).total).toBe(2);

    // sort by opportunity score → high (t1) before low (t2)
    const byScore = await listTrendsPage({ source: sourceKey, sort: "score", pageSize: 100 });
    expect(byScore.trends.map((t) => t.id)).toEqual([t1, t2]);

    // pagination — pageSize 1 → 2 pages, no overlap
    const p1 = await listTrendsPage({ source: sourceKey, sort: "score", page: 1, pageSize: 1 });
    const p2 = await listTrendsPage({ source: sourceKey, sort: "score", page: 2, pageSize: 1 });
    expect(p1.pageCount).toBe(2);
    expect(p1.trends[0]!.id).toBe(t1);
    expect(p2.trends[0]!.id).toBe(t2);
  });
});
