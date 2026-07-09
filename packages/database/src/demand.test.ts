import { describe, expect, it } from "vitest";
import { mineDemand } from "./demand";

describe("mineDemand", () => {
  it("detects demand-expressing phrases", () => {
    expect(mineDemand("Ask HN: how do you monitor LLM costs?")).toBe("Ask HN");
    expect(mineDemand("Is there a tool for tracking AI model releases?")).toBe("is there a tool");
    expect(mineDemand("I wish there was an open-source Perplexity")).toBe("I wish there was");
    expect(mineDemand("Looking for a self-hosted vector database")).toBe("looking for");
    expect(mineDemand("Any good alternative to Pinecone?")).toBe("alternative to");
  });

  it("does not fire on supply-side / neutral titles", () => {
    expect(mineDemand("Show HN: I built an open-source Perplexity")).toBeNull();
    expect(mineDemand("meta-llama/Meta-Llama-3-8B")).toBeNull();
    expect(mineDemand("Released v2.0 of our inference server")).toBeNull();
  });
});
