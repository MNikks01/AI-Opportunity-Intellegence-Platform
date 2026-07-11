import { describe, expect, it } from "vitest";
import {
  prisma,
  computeMomentum,
  recordEntitySnapshots,
  getEntityMomentumMap,
  listTrackedEntities,
} from "./index";

const DAY = 24 * 60 * 60 * 1000;

// --- Pure unit tests (no DB) ---
describe("computeMomentum", () => {
  const at = (daysAgo: number) => new Date(Date.now() - daysAgo * DAY);

  it("reports 'new' with fewer than two points", () => {
    expect(computeMomentum([]).state).toBe("new");
    const one = computeMomentum([{ value: 3, at: at(0) }]);
    expect(one.state).toBe("new");
    expect(one.current).toBe(3);
    expect(one.spark).toEqual([3]);
  });

  it("computes accelerating momentum against a ~7-day baseline", () => {
    const m = computeMomentum([
      { value: 2, at: at(14) },
      { value: 5, at: at(7) },
      { value: 12, at: at(0) },
    ]);
    expect(m.state).toBe("accelerating");
    expect(m.current).toBe(12);
    expect(m.delta).toBe(7); // 12 now vs 5 a week ago
    expect(m.pct).toBe(140);
    expect(m.spark).toEqual([2, 5, 12]);
  });

  it("reports cooling when the metric falls, and null pct when baseline is 0", () => {
    expect(
      computeMomentum([
        { value: 8, at: at(8) },
        { value: 3, at: at(0) },
      ]).state,
    ).toBe("cooling");
    const fromZero = computeMomentum([
      { value: 0, at: at(8) },
      { value: 4, at: at(0) },
    ]);
    expect(fromZero.state).toBe("accelerating");
    expect(fromZero.pct).toBeNull();
  });

  it("reports steady when unchanged and caps the sparkline at 12 points", () => {
    expect(
      computeMomentum([
        { value: 5, at: at(8) },
        { value: 5, at: at(0) },
      ]).state,
    ).toBe("steady");
    const many = Array.from({ length: 20 }, (_, i) => ({ value: i, at: at(20 - i) }));
    expect(computeMomentum(many).spark).toHaveLength(12);
  });
});

// --- DB-integration (guarded) ---
const enabled = Boolean(process.env.DATABASE_URL);

describe.skipIf(!enabled)("entity snapshots + tracking (integration)", () => {
  it("snapshots tracked entities, derives momentum, and lists them", async () => {
    const suffix = Date.now();
    // A tracked (MODEL) entity linked to two trends carrying signals, plus an untracked (PERSON) one.
    const model = await prisma.entity.create({
      data: { type: "MODEL", name: `test-model-${suffix}`, externalRefs: {} },
    });
    const person = await prisma.entity.create({
      data: { type: "PERSON", name: `test-person-${suffix}`, externalRefs: {} },
    });
    const source = await prisma.source.create({
      data: { key: `es-src-${suffix}`, legalityTier: "OFFICIAL", rateConfig: {} },
    });
    const trend = await prisma.trend.create({
      data: { slug: `es-trend-${suffix}`, title: "ES trend" },
    });
    // two signals on the trend
    for (let i = 0; i < 2; i++) {
      const sig = await prisma.signal.create({
        data: { sourceId: source.id, externalId: `es-${suffix}-${i}`, raw: {} },
      });
      await prisma.trendSignal.create({ data: { trendId: trend.id, signalId: sig.id } });
    }
    await prisma.trendEntity.create({ data: { trendId: trend.id, entityId: model.id } });

    // Seed a week-old snapshot so the fresh one shows acceleration, then record a live one.
    await prisma.entitySnapshot.create({
      data: {
        entityId: model.id,
        linkedTrendCount: 1,
        signalWeight: 0,
        capturedAt: new Date(Date.now() - 7 * DAY),
      },
    });
    const rec = await recordEntitySnapshots();
    expect(rec.count).toBeGreaterThanOrEqual(1);

    const m = (await getEntityMomentumMap([model.id])).get(model.id)!;
    expect(m.current).toBe(2); // Σ signals across linked trends
    expect(m.state).toBe("accelerating");

    const tracked = await listTrackedEntities({ type: "MODEL", sort: "signal" });
    const row = tracked.find((e) => e.id === model.id)!;
    expect(row).toBeTruthy();
    expect(row.linkedTrendCount).toBe(1);
    expect(row.signalWeight).toBe(2);
    // The untracked PERSON entity never appears in the supply leaderboard.
    expect(tracked.some((e) => e.id === person.id)).toBe(false);

    await prisma.entity.delete({ where: { id: model.id } });
    await prisma.entity.delete({ where: { id: person.id } });
    await prisma.trend.delete({ where: { id: trend.id } });
    await prisma.source.delete({ where: { id: source.id } });
  });
});
