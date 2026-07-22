import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { StubProvider } from "@aioi/ai-sdk";
import { classifyByRules } from "@aioi/intel-core";
import { prisma, ensureSource, seedCategories } from "@aioi/database";
import {
  analyzeSignals,
  buildAnalysisInput,
  credibilityScore,
  signalBody,
  ANALYSIS_PROMPT_VERSION,
} from "./analyze-signal";
import type { SignalForAnalysis } from "@aioi/database";

describe("signalBody", () => {
  it("combines title and the source summary/description", () => {
    const body = signalBody({
      title: "OpenAI ships agents",
      raw: { summary: "A new toolkit", description: "ignored dup key handled" },
    });
    expect(body).toContain("OpenAI ships agents");
    expect(body).toContain("A new toolkit");
  });

  it("handles a null title and non-object raw", () => {
    expect(signalBody({ title: null, raw: null })).toBe("");
  });
});

describe("credibilityScore", () => {
  it("ranks official sources above gray ones and clamps to 1..100", () => {
    const official = credibilityScore("OFFICIAL", 1, 0.9);
    const gray = credibilityScore("GRAY", 0.1, 0.4);
    expect(official).toBeGreaterThan(gray);
    expect(official).toBeLessThanOrEqual(100);
    expect(gray).toBeGreaterThanOrEqual(1);
  });
});

describe("buildAnalysisInput", () => {
  it("falls back to the region hint when the model returns OTHER", async () => {
    const signal: SignalForAnalysis = {
      id: randomUUID(),
      title: "DeepSeek releases a model",
      url: null,
      raw: {},
      sourceKey: "rss:x",
      legalityTier: "OFFICIAL",
      defaultCategoryKey: null,
      sourceRegion: null,
    };
    const body = signalBody(signal);
    const content = await new StubProvider().analyzeSignal({
      title: signal.title!,
      body,
      sourceKey: signal.sourceKey,
      validCategoryKeys: ["ai-models"],
      // no regionHint → stub returns OTHER
    });
    const gate = { ...classifyByRules(signal.title!, body), regionHint: "CHINA" as const };
    const input = buildAnalysisInput(signal, content, gate, body);
    expect(input.region).toBe("CHINA");
    expect(input.promptVersion).toBe(ANALYSIS_PROMPT_VERSION);
    expect(input.contentHash).toHaveLength(64);
  });

  it("uses the source region tag as authoritative, overriding the model", async () => {
    const signal: SignalForAnalysis = {
      id: randomUUID(),
      title: "Startup raises funding, partners with OpenAI",
      url: null,
      raw: {},
      sourceKey: "rss:the-bridge-jp",
      legalityTier: "OFFICIAL",
      defaultCategoryKey: null,
      sourceRegion: "JAPAN", // region-tagged feed
    };
    const body = signalBody(signal);
    // Model confidently says US (it name-drops OpenAI) — the JAPAN source tag must still win.
    const content = {
      ...(await new StubProvider().analyzeSignal({
        title: signal.title!,
        body,
        sourceKey: signal.sourceKey,
        validCategoryKeys: ["ai-models"],
      })),
      region: "US" as const,
    };
    const gate = classifyByRules(signal.title!, body);
    expect(buildAnalysisInput(signal, content, gate, body).region).toBe("JAPAN");
  });
});

// ── Full pipeline (integration) ──
const hasDb = Boolean(process.env.DATABASE_URL);
const sourceKey = `rss:analyzetest-${randomUUID().slice(0, 8)}`;

describe.skipIf(!hasDb)("analyzeSignals pipeline (integration)", () => {
  afterAll(async () => {
    await prisma.source.deleteMany({ where: { key: sourceKey } }).catch(() => {}); // cascades signals
  });

  it("gates off-topic signals, analyzes AI ones, and reuses the cache for duplicates", async () => {
    await seedCategories();
    const sourceId = await ensureSource(sourceKey, "OFFICIAL", { region: "US" });
    const now = new Date();
    const aiTitle = "OpenAI ships a new open-source LLM agent framework for developers";

    await prisma.signal.createMany({
      data: [
        {
          sourceId,
          externalId: "ai-1",
          title: aiTitle,
          raw: { summary: "agentic LLM toolkit" },
          fetchedAt: now,
        },
        {
          sourceId,
          externalId: "ai-dup",
          title: aiTitle,
          raw: { summary: "agentic LLM toolkit" },
          fetchedAt: now,
        },
        {
          sourceId,
          externalId: "off-1",
          title: "City council approves new bike lanes",
          raw: {},
          fetchedAt: now,
        },
      ],
    });

    const res = await analyzeSignals({ provider: new StubProvider(), limit: 100, budget: 25 });

    expect(res.analyzed).toBeGreaterThanOrEqual(1);
    expect(res.skipped).toBeGreaterThanOrEqual(1); // the bike-lanes signal
    expect(res.cacheHits).toBeGreaterThanOrEqual(1); // the duplicate AI signal

    // Both AI signals end up analyzed; the off-topic one does not.
    const analyzed = await prisma.signalAnalysis.findMany({
      where: { signal: { source: { key: sourceKey } } },
      select: { signalId: true, opportunityScore: true },
    });
    expect(analyzed.length).toBe(2);
    for (const a of analyzed) expect(a.opportunityScore).toBeGreaterThanOrEqual(1);

    // Category tags were written for the analyzed signals.
    const tags = await prisma.signalCategory.count({
      where: { signal: { source: { key: sourceKey } } },
    });
    expect(tags).toBeGreaterThanOrEqual(1);
  });
});
