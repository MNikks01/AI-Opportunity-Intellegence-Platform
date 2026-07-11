import { describe, expect, it } from "vitest";
import { prisma, ensureSource, listTrendsQuadrant } from "./index";

const enabled = Boolean(process.env.DATABASE_URL);

describe.skipIf(!enabled)("listTrendsQuadrant (integration)", () => {
  it("maps business→demand, competition→supply, and lifts demand for mined-demand signals", async () => {
    const trend = await prisma.trend.create({
      data: { slug: `quad-${Date.now()}`, title: "Quadrant test" },
    });
    const base = { confidence: 0.9, rationale: "t", evidence: {}, rubricVersion: `t-${trend.id}` };
    await prisma.score.createMany({
      data: [
        // Business 45 alone is below the midpoint (would sit in "too early" with low supply).
        { trendId: trend.id, dimension: "BUSINESS", value: 45, band: "MEDIUM", ...base },
        { trendId: trend.id, dimension: "COMPETITION", value: 20, band: "LOW", ...base },
        { trendId: trend.id, dimension: "OPPORTUNITY", value: 60, band: "MEDIUM", ...base },
      ],
    });
    // A signal that expresses demand → lifts the trend up the demand axis.
    const sourceId = await ensureSource("hackernews");
    const signal = await prisma.signal.create({
      data: {
        sourceId,
        externalId: `demand-${trend.id}`,
        title: "Ask HN: is there a tool for tracking new AI model releases?",
        raw: {},
      },
    });
    await prisma.trendSignal.create({ data: { trendId: trend.id, signalId: signal.id } });

    const row = (await listTrendsQuadrant(300)).find((t) => t.slug === trend.slug)!;
    expect(row.businessDemand).toBe(45);
    expect(row.supply).toBe(20);
    expect(row.demandSignals).toBe(1);
    expect(row.demand).toBe(57); // 45 + 12 lift
    expect(row.quadrant).toBe("build"); // lifted over the midpoint, low supply

    await prisma.trend.delete({ where: { id: trend.id } });
    await prisma.signal.delete({ where: { id: signal.id } });
  });

  it("lifts demand for a funding (SEC EDGAR Form D) signal", async () => {
    const trend = await prisma.trend.create({
      data: { slug: `quadf-${Date.now()}`, title: "Funding quadrant test" },
    });
    const base = { confidence: 0.9, rationale: "t", evidence: {}, rubricVersion: `f-${trend.id}` };
    await prisma.score.createMany({
      data: [
        { trendId: trend.id, dimension: "BUSINESS", value: 40, band: "MEDIUM", ...base },
        { trendId: trend.id, dimension: "COMPETITION", value: 20, band: "LOW", ...base },
        { trendId: trend.id, dimension: "OPPORTUNITY", value: 55, band: "MEDIUM", ...base },
      ],
    });
    const sourceId = await ensureSource("sec-edgar");
    const signal = await prisma.signal.create({
      data: {
        sourceId,
        externalId: `fund-${trend.id}`,
        title: "Acme AI Inc. — private funding (Form D)",
        raw: {},
      },
    });
    await prisma.trendSignal.create({ data: { trendId: trend.id, signalId: signal.id } });

    const row = (await listTrendsQuadrant(300)).find((t) => t.slug === trend.slug)!;
    expect(row.fundingSignals).toBe(1);
    expect(row.demand).toBe(55); // 40 + 15 funding lift
    expect(row.quadrant).toBe("build");

    await prisma.trend.delete({ where: { id: trend.id } });
    await prisma.signal.delete({ where: { id: signal.id } });
  });
});
