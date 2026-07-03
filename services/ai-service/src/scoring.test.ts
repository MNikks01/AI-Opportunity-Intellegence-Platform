import { describe, expect, it } from "vitest";
import { StubProvider } from "@aioi/ai-sdk";
import { SCORE_DIMENSIONS, type TrendLike } from "@aioi/shared";
import { scoreSchema } from "@aioi/validation";
import { InMemoryScoreCache, RUBRIC_VERSION, cacheKey, scoreTrend } from "./scoring";

const trend: TrendLike = {
  id: "trend-1",
  slug: "mcp-servers-local-models",
  title: "MCP servers for local models",
  status: "ACTIVE",
  signals: [
    { source: "hackernews", externalId: "111", title: "Show HN: local MCP", text: "surging interest in MCP for local LLMs" },
    { source: "github", externalId: "222", title: "repo x", text: "1.2k stars this week for an MCP server" },
  ],
};

describe("scoreTrend", () => {
  it("returns all 10 dimensions, each schema-valid", async () => {
    const scores = await scoreTrend(trend, { provider: new StubProvider() });
    expect(scores).toHaveLength(SCORE_DIMENSIONS.length);
    for (const s of scores) expect(() => scoreSchema.parse(s)).not.toThrow();
    const dims = new Set(scores.map((s) => s.dimension));
    for (const d of SCORE_DIMENSIONS) expect(dims.has(d)).toBe(true);
  });

  it("computes the composite opportunity from sub-scores", async () => {
    const scores = await scoreTrend(trend, { provider: new StubProvider() });
    const opp = scores.find((s) => s.dimension === "opportunity");
    expect(opp).toBeDefined();
    expect(opp!.value).toBeGreaterThanOrEqual(0);
    expect(opp!.value).toBeLessThanOrEqual(100);
    expect(opp!.composedFrom?.length).toBe(8); // business,monet,seo,dev,creator,competition,risk,difficulty
    expect(opp!.evidence.length).toBeGreaterThan(0);
    expect(opp!.rubricVersion).toBe(RUBRIC_VERSION);
  });

  it("is deterministic with the stub provider (regression smoke)", async () => {
    const a = await scoreTrend(trend, { provider: new StubProvider() });
    const b = await scoreTrend(trend, { provider: new StubProvider() });
    expect(a).toEqual(b);
  });

  it("uses the cache keyed by (trendId, dimension, rubricVersion)", async () => {
    const cache = new InMemoryScoreCache();
    await scoreTrend(trend, { provider: new StubProvider(), cache });
    expect(cache.get(cacheKey("trend-1", "opportunity", RUBRIC_VERSION))).toBeDefined();
    expect(cache.get(cacheKey("trend-1", "business", RUBRIC_VERSION))).toBeDefined();
  });

  it("rejects a trend with no signals (grounding rule)", async () => {
    await expect(scoreTrend({ ...trend, signals: [] })).rejects.toThrow();
  });
});
