import { describe, expect, it } from "vitest";
import { prisma, ensureSource, listRecentFunding, getTrendFundingHits } from "./index";

const enabled = Boolean(process.env.DATABASE_URL);

describe.skipIf(!enabled)("funding (integration)", () => {
  it("lists recent funding events with issuer + linked trends, and counts funding hits", async () => {
    const suffix = Date.now();
    const sourceId = await ensureSource("sec-edgar");
    const trend = await prisma.trend.create({
      data: { slug: `fund-trend-${suffix}`, title: "AI funding trend" },
    });
    const signal = await prisma.signal.create({
      data: {
        sourceId,
        externalId: `edgar-${suffix}`,
        title: "Acme AI Inc. — private funding (Form D)",
        url: "https://www.sec.gov/Archives/edgar/data/1234567/000/",
        publishedAt: new Date("2026-07-01"),
        raw: { form: "D" },
      },
    });
    await prisma.trendSignal.create({ data: { trendId: trend.id, signalId: signal.id } });

    const events = await listRecentFunding(200);
    const ev = events.find((e) => e.id === signal.id)!;
    expect(ev).toBeTruthy();
    expect(ev.issuer).toBe("Acme AI Inc."); // suffix stripped from the title
    expect(ev.trends.some((t) => t.slug === trend.slug)).toBe(true);

    const hits = await getTrendFundingHits([trend.id]);
    expect(hits.get(trend.id)).toBe(1);

    await prisma.trend.delete({ where: { id: trend.id } });
    await prisma.signal.delete({ where: { id: signal.id } });
  });
});
