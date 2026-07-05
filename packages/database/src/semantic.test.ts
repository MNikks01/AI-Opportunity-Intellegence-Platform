import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Score, TrendLike } from "@aioi/shared";
import { prisma } from "./client";
import { persistScoredTrend, semanticSearchTrends } from "./repositories";

// Integration — needs a live Postgres with pgvector. persistScoredTrend backfills the embedding
// (StubEmbedder, deterministic), so a query equal to a trend's embedded text is its nearest neighbor.
const hasDb = Boolean(process.env.DATABASE_URL);
const slugs: string[] = [];

const score: Score = {
  dimension: "opportunity",
  value: 70,
  band: "high",
  confidence: 0.5,
  rationale: "r",
  evidence: ["hackernews:1"],
  rubricVersion: "2026-07-01",
};

async function mk(title: string, summary: string): Promise<{ slug: string; text: string }> {
  const slug = `sem-${randomUUID().slice(0, 8)}`;
  const trend: TrendLike = {
    id: "x",
    slug,
    title,
    summary,
    status: "ACTIVE",
    signals: [{ source: "hackernews", externalId: `${slug}-1`, title: "s", text: "t" }],
  };
  await persistScoredTrend(trend, [score]);
  slugs.push(slug);
  return { slug, text: `${title}\n${summary}` };
}

describe.skipIf(!hasDb)("semanticSearchTrends (integration)", () => {
  let target: { slug: string; text: string };

  beforeAll(async () => {
    target = await mk("Alpha semantic zebra quokka", "narwhal");
    await mk("Beta unrelated aardvark", "wombat");
  });
  afterAll(async () => {
    for (const s of slugs) await prisma.trend.delete({ where: { slug: s } }).catch(() => {});
  });

  it("ranks the trend whose embedded text matches the query first", async () => {
    const res = await semanticSearchTrends(target.text, 5);
    expect(res[0]!.slug).toBe(target.slug); // identical stub embedding → cosine distance 0
    expect(Array.isArray(res[0]!.scores)).toBe(true); // TrendView shape
  });

  it("returns empty for a blank query", async () => {
    expect(await semanticSearchTrends("   ")).toHaveLength(0);
  });
});
