import { describe, expect, it } from "vitest";
import { prisma, listTrendsQuadrant } from "./index";

const enabled = Boolean(process.env.DATABASE_URL);

describe.skipIf(!enabled)("listTrendsQuadrant (integration)", () => {
  it("maps business→demand, competition→supply and classifies the build quadrant", async () => {
    const trend = await prisma.trend.create({
      data: { slug: `quad-${Date.now()}`, title: "Quadrant test" },
    });
    const base = { confidence: 0.9, rationale: "t", evidence: {}, rubricVersion: `t-${trend.id}` };
    await prisma.score.createMany({
      data: [
        { trendId: trend.id, dimension: "BUSINESS", value: 80, band: "HIGH", ...base },
        { trendId: trend.id, dimension: "COMPETITION", value: 20, band: "LOW", ...base },
        { trendId: trend.id, dimension: "OPPORTUNITY", value: 75, band: "HIGH", ...base },
      ],
    });

    const row = (await listTrendsQuadrant(300)).find((t) => t.slug === trend.slug)!;
    expect(row.demand).toBe(80); // business
    expect(row.supply).toBe(20); // competition
    expect(row.opportunity).toBe(75);
    expect(row.quadrant).toBe("build"); // high demand, low supply

    await prisma.trend.delete({ where: { id: trend.id } });
  });
});
