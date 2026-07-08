import { describe, expect, it } from "vitest";
import { prisma, getTrendMomentumMap } from "./index";

const DAY = 24 * 60 * 60 * 1000;
const enabled = Boolean(process.env.DATABASE_URL);

describe.skipIf(!enabled)("getTrendMomentumMap (integration)", () => {
  it("computes accelerating momentum against a ~7-day baseline", async () => {
    const trend = await prisma.trend.create({
      data: { slug: `mom-${Date.now()}`, title: "Momentum test" },
    });
    const now = Date.now();
    await prisma.trendSnapshot.createMany({
      data: [
        { trendId: trend.id, signalCount: 2, capturedAt: new Date(now - 14 * DAY) },
        { trendId: trend.id, signalCount: 5, capturedAt: new Date(now - 7 * DAY) },
        { trendId: trend.id, signalCount: 12, capturedAt: new Date(now) },
      ],
    });

    const m = (await getTrendMomentumMap([trend.id])).get(trend.id)!;
    expect(m.state).toBe("accelerating");
    expect(m.current).toBe(12);
    expect(m.delta).toBe(7); // 12 now vs 5 a week ago
    expect(m.pct).toBe(140);
    expect(m.spark).toEqual([2, 5, 12]);

    await prisma.trend.delete({ where: { id: trend.id } });
  });

  it("reports 'new' until a second snapshot exists", async () => {
    const trend = await prisma.trend.create({
      data: { slug: `mom1-${Date.now()}`, title: "One snapshot" },
    });
    await prisma.trendSnapshot.create({ data: { trendId: trend.id, signalCount: 3 } });

    const m = (await getTrendMomentumMap([trend.id])).get(trend.id)!;
    expect(m.state).toBe("new");
    expect(m.current).toBe(3);

    await prisma.trend.delete({ where: { id: trend.id } });
  });
});
