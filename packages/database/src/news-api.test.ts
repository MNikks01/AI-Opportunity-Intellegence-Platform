import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "./client";
import { ensureSource } from "./repositories";
import { seedCategories } from "./taxonomy";
import { upsertSignalAnalysis, type SignalAnalysisInput } from "./signal-analysis";
import { getNewsItem, listNews, newsRegionStats } from "./signal-search";
import { listModelCards } from "./model-cards";

const hasDb = Boolean(process.env.DATABASE_URL);
const sourceKey = `rss:newsapi-${randomUUID().slice(0, 8)}`;
const modelName = `TestModel-${randomUUID().slice(0, 8)}`;

function analysis(signalId: string, opp: number): SignalAnalysisInput {
  return {
    signalId,
    region: "US",
    language: "en",
    tldr: "tldr",
    payload: { tldr: "tldr", opportunities: { business: { score: opp, why: "x" } } },
    impactScore: 50,
    opportunityScore: opp,
    credibilityScore: 72,
    contentHash: randomUUID(),
    promptVersion: "test",
    categories: [{ key: "robotics", confidence: 0.9 }],
  };
}

describe.skipIf(!hasDb)("news API reads (integration)", () => {
  const ids: Record<string, string> = {};

  afterAll(async () => {
    await prisma.source.deleteMany({ where: { key: sourceKey } }).catch(() => {});
    await prisma.entity.deleteMany({ where: { name: modelName } }).catch(() => {}); // cascades modelCard
  });

  it("listNews filters by category and honors the opportunity sort", async () => {
    await seedCategories();
    const sourceId = await ensureSource(sourceKey, "OFFICIAL", { region: "US" });
    const mk = async (ext: string) =>
      (await prisma.signal.create({ data: { sourceId, externalId: ext, title: ext, raw: {} } })).id;
    ids.hi = await mk("hi");
    ids.lo = await mk("lo");
    await upsertSignalAnalysis(analysis(ids.hi, 90));
    await upsertSignalAnalysis(analysis(ids.lo, 10));

    const byOpp = await listNews({ categoryKey: "robotics" }, "opportunity", 100);
    const order = byOpp.map((h) => h.id);
    expect(order).toContain(ids.hi);
    expect(order).toContain(ids.lo);
    expect(order.indexOf(ids.hi)).toBeLessThan(order.indexOf(ids.lo)); // 90 before 10
  });

  it("getNewsItem returns the full analysis payload", async () => {
    const item = await getNewsItem(ids.hi!);
    expect(item).not.toBeNull();
    expect(item!.opportunityScore).toBe(90);
    expect(item!.categories).toContain("robotics");
    expect((item!.analysis as { opportunities?: unknown }).opportunities).toBeDefined();
  });

  it("getNewsItem returns null for an unknown id", async () => {
    expect(await getNewsItem(randomUUID())).toBeNull();
  });

  it("newsRegionStats aggregates count + avg opportunity by region", async () => {
    const stats = await newsRegionStats();
    const us = stats.find((s) => s.region === "US");
    expect(us).toBeDefined(); // this test's two US signals (opp 90 + 10)
    expect(us!.count).toBeGreaterThanOrEqual(2);
    expect(us!.avgOpportunity).toBeGreaterThanOrEqual(1);
    expect(us!.avgOpportunity).toBeLessThanOrEqual(100);
  });

  it("listModelCards lists tracked MODEL entities with their card detail", async () => {
    const entity = await prisma.entity.create({
      data: { type: "MODEL", name: modelName, externalRefs: {} },
    });
    await prisma.modelCard.create({
      data: { entityId: entity.id, license: "apache-2.0", paramsB: 7, ggufAvailable: true },
    });

    const gguf = await listModelCards({ gguf: true }, 100);
    const mine = gguf.find((m) => m.name === modelName);
    expect(mine).toBeDefined();
    expect(mine!.license).toBe("apache-2.0");
    expect(mine!.ggufAvailable).toBe(true);
    expect(mine!.paramsB).toBe(7);
  });
});
