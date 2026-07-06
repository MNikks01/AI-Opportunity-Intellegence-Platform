import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "./client";
import { ensureSource } from "./repositories";
import { getSourceStats } from "./source-stats";

const hasDb = Boolean(process.env.DATABASE_URL);
const key = `sourcestat-${randomUUID().slice(0, 8)}`;

describe.skipIf(!hasDb)("getSourceStats (integration)", () => {
  afterAll(async () => {
    await prisma.source.deleteMany({ where: { key } }).catch(() => {}); // cascades signals
  });

  it("reports signal count + last-ingested per source", async () => {
    const sourceId = await ensureSource(key);
    const older = new Date("2026-07-01T00:00:00Z");
    const newer = new Date("2026-07-05T00:00:00Z");
    await prisma.signal.create({
      data: { sourceId, externalId: "s1", title: "a", raw: {}, fetchedAt: older },
    });
    await prisma.signal.create({
      data: { sourceId, externalId: "s2", title: "b", raw: {}, fetchedAt: newer },
    });

    const stats = await getSourceStats();
    const row = stats.find((s) => s.source === key);
    expect(row).toBeDefined();
    expect(row!.signalCount).toBe(2);
    expect(row!.legalityTier).toBe("OFFICIAL");
    expect(row!.lastFetchedAt?.toISOString()).toBe(newer.toISOString());
  });
});
