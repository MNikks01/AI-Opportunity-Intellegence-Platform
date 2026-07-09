import { describe, expect, it } from "vitest";
import { prisma, listTrendSlugs, getTrendSeo, getEntitySeo } from "./index";

const enabled = Boolean(process.env.DATABASE_URL);

describe.skipIf(!enabled)("seo helpers (integration)", () => {
  it("lists scored trend slugs and returns per-page metadata", async () => {
    const trend = await prisma.trend.create({
      data: { slug: `seo-${Date.now()}`, title: "SEO trend", summary: "A concise summary." },
    });
    await prisma.score.create({
      data: {
        trendId: trend.id,
        dimension: "OPPORTUNITY",
        value: 60,
        band: "MEDIUM",
        confidence: 0.9,
        rationale: "t",
        evidence: {},
        rubricVersion: `t-${trend.id}`,
      },
    });

    const slugs = (await listTrendSlugs(5000)).map((t) => t.slug);
    expect(slugs).toContain(trend.slug); // scored → in the sitemap

    const seo = await getTrendSeo(trend.slug);
    expect(seo).toEqual({ title: "SEO trend", summary: "A concise summary." });

    await prisma.trend.delete({ where: { id: trend.id } });
  });

  it("getEntitySeo returns null on a malformed id instead of throwing", async () => {
    expect(await getEntitySeo("not-a-uuid")).toBeNull();
  });
});
