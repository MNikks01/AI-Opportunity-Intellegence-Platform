import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createTrendFromSignalIds, ensureSource, listTrends, prisma } from "@aioi/database";
import { scoreClusteredTrends } from "./score-trends";

const enabled = Boolean(process.env.DATABASE_URL) && Boolean(process.env.APP_DATABASE_URL);
const sourceKey = `score-test-${randomUUID().slice(0, 8)}`;
let trendId: string | undefined;

describe.skipIf(!enabled)("scoreClusteredTrends (integration)", () => {
  afterAll(async () => {
    if (trendId) await prisma.trend.delete({ where: { id: trendId } }).catch(() => {});
    await prisma.source.deleteMany({ where: { key: sourceKey } }).catch(() => {});
  });

  it("scores an unscored (clustered) trend with a full scorecard", async () => {
    // Arrange: a clustered trend (created the way clustering does — no scores)
    const sourceId = await ensureSource(sourceKey);
    const sig = await prisma.signal.create({
      data: { sourceId, externalId: "x1", title: "autonomous coding agents surge", raw: {} },
    });
    trendId = await createTrendFromSignalIds([sig.id], "Autonomous coding agents");

    // Act
    const res = await scoreClusteredTrends({ limit: 100 });
    expect(res.scored).toBeGreaterThan(0);

    // Assert: the trend now has a 10-dimension scorecard incl. a composite opportunity
    const scored = (await listTrends(200)).find((t) => t.id === trendId);
    expect(scored).toBeDefined();
    expect(scored!.scores.length).toBe(10);
    const opp = scored!.scores.find((s) => s.dimension === "opportunity");
    expect(opp).toBeDefined();
    expect(opp!.value).toBeGreaterThanOrEqual(0);
    expect(opp!.value).toBeLessThanOrEqual(100);
  });
});
