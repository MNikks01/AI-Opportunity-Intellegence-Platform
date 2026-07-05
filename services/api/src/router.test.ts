import { beforeAll, describe, expect, it } from "vitest";
import { persistScoredTrend } from "@aioi/database";
import type { Score, TrendLike } from "@aioi/shared";
import { appRouter } from "./router";
import { createContext } from "./trpc";

// Integration test — needs a live Postgres. Skipped when DATABASE_URL is unset (default unit runs).
const hasDb = Boolean(process.env.DATABASE_URL);

const slug = "router-test-trend";
const trend: TrendLike = {
  id: "rt",
  slug,
  title: "Router test trend",
  summary: "seeded by router.test.ts",
  status: "ACTIVE",
  signals: [{ source: "hackernews", externalId: "rt-1", title: "t", text: "router test signal" }],
};
const scores: Score[] = [
  {
    dimension: "opportunity",
    value: 71,
    band: "high",
    confidence: 0.6,
    rationale: "seed",
    evidence: ["hackernews:rt-1"],
    rubricVersion: "2026-07-01",
  },
];

describe.skipIf(!hasDb)("api router (integration)", () => {
  beforeAll(async () => {
    await persistScoredTrend(trend, scores);
  });

  it("trends.list returns the seeded trend with scores", async () => {
    const caller = appRouter.createCaller(await createContext());
    const list = await caller.trends.list({ limit: 100 });
    const found = list.find((t) => t.slug === slug);
    expect(found).toBeDefined();
    expect(found!.scores.some((s) => s.dimension === "opportunity")).toBe(true);
  });

  it("trends.bySlug returns the trend detail", async () => {
    const caller = appRouter.createCaller(await createContext());
    const detail = await caller.trends.bySlug({ slug });
    expect(detail.title).toBe("Router test trend");
    expect(detail.scores[0]?.rubricVersion).toBe("2026-07-01");
  });

  it("trends.bySlug throws NOT_FOUND for a missing slug", async () => {
    const caller = appRouter.createCaller(await createContext());
    await expect(caller.trends.bySlug({ slug: "does-not-exist-xyz" })).rejects.toThrow();
  });

  it("trends.search finds the seeded trend by keyword", async () => {
    const caller = appRouter.createCaller(await createContext());
    const results = await caller.trends.search({ q: "router test" });
    expect(results.some((t) => t.slug === slug)).toBe(true);
  });

  it("trends.semanticSearch returns the seeded trend for its embedded text", async () => {
    const caller = appRouter.createCaller(await createContext());
    const results = await caller.trends.semanticSearch({ q: `${trend.title}\n${trend.summary}` });
    expect(results.some((t) => t.slug === slug)).toBe(true);
  });
});
