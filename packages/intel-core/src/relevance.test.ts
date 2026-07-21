import { describe, expect, it } from "vitest";
import { classifyByRules } from "./relevance";
import { isCategoryKey } from "./taxonomy";

describe("classifyByRules", () => {
  it("flags an AI model launch and tags the right category + region", () => {
    const r = classifyByRules("DeepSeek releases new open-source LLM with strong benchmarks");
    expect(r.relevant).toBe(true);
    expect(r.score).toBeGreaterThan(0);
    expect(r.categories.some((c) => c.key === "ai-models")).toBe(true);
    expect(r.regionHint).toBe("CHINA");
  });

  it("detects coding-AI tools", () => {
    const r = classifyByRules("Cursor and GitHub Copilot ship new agent features");
    expect(r.categories[0]?.key).toBe("coding-ai");
  });

  it("rejects off-topic content", () => {
    const r = classifyByRules("Local bakery wins award for sourdough bread");
    expect(r.relevant).toBe(false);
    expect(r.score).toBe(0);
    expect(r.categories).toHaveLength(0);
    expect(r.regionHint).toBeUndefined();
  });

  it("does not match 'ai' inside another word (boundary check)", () => {
    // "brain" and "raining" contain the substring 'ai' but must not count as AI-relevant on their own.
    const r = classifyByRules("Training the brain while raining outside");
    expect(r.relevant).toBe(false);
  });

  it("saturates the score for strongly on-topic text", () => {
    const r = classifyByRules(
      "OpenAI, Anthropic, and NVIDIA discuss LLM inference, GPUs, and generative AI agents",
    );
    expect(r.score).toBe(1);
  });

  it("only ever emits known category keys", () => {
    const r = classifyByRules("Mistral funding round; new arXiv paper on multimodal agents");
    for (const c of r.categories) expect(isCategoryKey(c.key)).toBe(true);
  });
});
