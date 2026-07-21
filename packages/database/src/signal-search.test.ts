import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "./client";
import { ensureSource } from "./repositories";
import { seedCategories } from "./taxonomy";
import { upsertSignalAnalysis, type SignalAnalysisInput } from "./signal-analysis";
import { reembedSignals, rrf, searchNews, searchSignalsHybrid } from "./signal-search";

describe("rrf (pure)", () => {
  it("fuses two ranked lists, rewarding agreement", () => {
    const fused = rrf([
      ["a", "b", "c"],
      ["b", "a", "d"],
    ]);
    // 'a' and 'b' appear high in both → ahead of 'c'/'d' which appear in only one.
    expect(fused.slice(0, 2).sort()).toEqual(["a", "b"]);
    expect(fused).toContain("c");
    expect(fused).toContain("d");
  });

  it("dedupes ids across lists", () => {
    expect(rrf([["x"], ["x"]])).toEqual(["x"]);
  });
});

const hasDb = Boolean(process.env.DATABASE_URL);
const nonce = `zqx${randomUUID().slice(0, 6)}`; // unique FTS token to isolate this test's signals
const sourceKey = `rss:searchtest-${randomUUID().slice(0, 8)}`;

function analysis(signalId: string, region: string, categoryKey: string): SignalAnalysisInput {
  return {
    signalId,
    region,
    language: "en",
    tldr: `${nonce} tldr`,
    payload: { categories: [{ key: categoryKey, confidence: 0.9 }] },
    impactScore: 60,
    opportunityScore: 70,
    credibilityScore: 72,
    contentHash: randomUUID(),
    promptVersion: "test",
    categories: [{ key: categoryKey, confidence: 0.9 }],
  };
}

describe.skipIf(!hasDb)("signal search (integration)", () => {
  const ids: Record<string, string> = {};

  afterAll(async () => {
    await prisma.source.deleteMany({ where: { key: sourceKey } }).catch(() => {}); // cascades
  });

  it("indexes, filters, and hybrid-ranks news signals", async () => {
    await seedCategories();
    const sourceId = await ensureSource(sourceKey, "OFFICIAL", { region: "US" });

    const mk = async (externalId: string, title: string) => {
      const s = await prisma.signal.create({
        data: { sourceId, externalId, title, raw: {}, fetchedAt: new Date() },
      });
      return s.id;
    };
    ids.gpt = await mk("a", `${nonce} OpenAI releases a new GPT model for developers`);
    ids.kling = await mk("b", `${nonce} Kling ships a new video model`);
    ids.bike = await mk("c", `${nonce} city approves new bike lanes`);

    await upsertSignalAnalysis(analysis(ids.gpt, "US", "ai-models"));
    await upsertSignalAnalysis(analysis(ids.kling, "CHINA", "video-ai"));
    // 'bike' intentionally left without analysis (still FTS-searchable, no region/category).

    // Backfill embeddings (deterministic stub embedder offline) so semantic ranking has vectors.
    await reembedSignals();

    // Unfiltered hybrid search finds all three (isolated by the nonce token).
    const all = await searchSignalsHybrid(`${nonce} model`, {}, 25);
    const foundIds = all.map((h) => h.id);
    expect(foundIds).toContain(ids.gpt);
    expect(foundIds).toContain(ids.kling);

    // Region filter → only the CHINA signal.
    const china = await searchSignalsHybrid(`${nonce} model`, { region: "CHINA" }, 25);
    expect(china.map((h) => h.id)).toEqual([ids.kling]);

    // Category filter → only the video-ai signal.
    const video = await searchSignalsHybrid(`${nonce} model`, { categoryKey: "video-ai" }, 25);
    expect(video.map((h) => h.id)).toEqual([ids.kling]);

    // A hydrated hit carries the analysis fields.
    const gptHit = all.find((h) => h.id === ids.gpt);
    expect(gptHit?.region).toBe("US");
    expect(gptHit?.opportunityScore).toBe(70);
    expect(gptHit?.categories).toContain("ai-models");
  });

  it("searchNews parses NL filters (region + category)", async () => {
    const hits = await searchNews(`${nonce} video models in China`, { limit: 25 });
    expect(hits.map((h) => h.id)).toEqual([ids.kling]);
  });
});
