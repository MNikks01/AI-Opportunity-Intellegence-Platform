import { describe, expect, it } from "vitest";
import { prisma, listTrendsForRescore, touchTrend, countScoredTrends } from "./index";

const enabled = Boolean(process.env.DATABASE_URL);

describe.skipIf(!enabled)("rescore queue (integration)", () => {
  it("queues scored trends (not unscored ones) and rotates via touchTrend", async () => {
    const scored = await prisma.trend.create({
      data: { slug: `rs-scored-${Date.now()}`, title: "Scored" },
    });
    const unscored = await prisma.trend.create({
      data: { slug: `rs-unscored-${Date.now()}`, title: "Unscored" },
    });
    await prisma.score.create({
      data: {
        trendId: scored.id,
        dimension: "OPPORTUNITY",
        value: 50,
        band: "MEDIUM",
        confidence: 0.9,
        rationale: "t",
        evidence: {},
        rubricVersion: `t-${scored.id}`,
      },
    });

    const before = await countScoredTrends();
    expect(before).toBeGreaterThanOrEqual(1);

    const queue = await listTrendsForRescore(500);
    const slugs = queue.map((t) => t.slug);
    expect(slugs).toContain(scored.slug); // has scores → in the queue
    expect(slugs).not.toContain(unscored.slug); // no scores → excluded

    // touchTrend rotates the trend to the back (newest updatedAt).
    const first = await prisma.trend.findUnique({ where: { id: scored.id } });
    await new Promise((r) => setTimeout(r, 5));
    await touchTrend(scored.id);
    const after = await prisma.trend.findUnique({ where: { id: scored.id } });
    expect(after!.updatedAt.getTime()).toBeGreaterThan(first!.updatedAt.getTime());

    await prisma.trend.delete({ where: { id: scored.id } });
    await prisma.trend.delete({ where: { id: unscored.id } });
  });
});
