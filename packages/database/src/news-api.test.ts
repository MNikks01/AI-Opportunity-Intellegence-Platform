import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "./client";
import { ensureSource } from "./repositories";
import { seedCategories } from "./taxonomy";
import { upsertSignalAnalysis, type SignalAnalysisInput } from "./signal-analysis";
import { getNewsItem, listNews, newsRegionStats } from "./signal-search";
import { listModelCards, listModelsForEnrichment, upsertModelCard } from "./model-cards";
import { retagAnalysisRegionsToSource } from "./signal-analysis";

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

  it("retagAnalysisRegionsToSource realigns analyses to a region-tagged source", async () => {
    const jpKey = `rss:jp-${randomUUID().slice(0, 8)}`;
    const sid = await ensureSource(jpKey, "OFFICIAL", { region: "JAPAN" });
    const signal = await prisma.signal.create({
      data: { sourceId: sid, externalId: "jp1", title: "jp story", raw: {} },
    });
    // Analyzed as US (the model name-dropped a US company) — the JAPAN source tag should win after retag.
    await upsertSignalAnalysis({ ...analysis(signal.id, 50), region: "US" });
    expect((await getNewsItem(signal.id))!.region).toBe("US");

    const updated = await retagAnalysisRegionsToSource();
    expect(updated).toBeGreaterThanOrEqual(1);
    expect((await getNewsItem(signal.id))!.region).toBe("JAPAN");

    await prisma.source.deleteMany({ where: { key: jpKey } }).catch(() => {}); // cascades
  });

  it("upsertModelCard enriches (idempotently) a model listed for enrichment", async () => {
    const entity = await prisma.entity.create({
      data: { type: "MODEL", name: `${modelName}-enrich`, externalRefs: {} },
    });

    const toEnrich = await listModelsForEnrichment(500);
    expect(toEnrich.some((m) => m.entityId === entity.id)).toBe(true);

    await upsertModelCard(entity.id, { license: "mit", paramsB: 8, vllmSupported: true });
    await upsertModelCard(entity.id, { license: "mit", paramsB: 8, vllmSupported: true }); // idempotent

    const card = await prisma.modelCard.findUnique({ where: { entityId: entity.id } });
    expect(card?.license).toBe("mit");
    expect(card?.vllmSupported).toBe(true);
    expect(card?.paramsB).toBe(8);

    await prisma.entity.delete({ where: { id: entity.id } }).catch(() => {}); // cascades card
  });
});
