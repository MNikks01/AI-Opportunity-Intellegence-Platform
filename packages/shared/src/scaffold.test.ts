import { describe, expect, it } from "vitest";
import { buildScaffoldPrompt, type ScaffoldInput } from "./scaffold";

const input: ScaffoldInput = {
  title: "Local-first LLM cost trackers",
  summary: "Developers want to watch token spend across providers.",
  plan: {
    saasIdeas: ["A dashboard that unifies LLM spend", "Budget alerts per project"],
    apiIdeas: ["POST /usage ingest endpoint"],
    productNames: ["TokenWatch", "SpendLLM"],
    keywords: ["llm cost", "token tracking"],
    domainNames: ["tokenwatch.dev"],
    targetAudience: "Indie developers shipping AI features",
    pricingHint: "Freemium with a $19/mo Pro tier",
    mvpScope: "Ingest usage events, one dashboard, budget alerts.",
    techStack: ["Next.js", "tRPC", "PostgreSQL"],
  },
};

describe("buildScaffoldPrompt", () => {
  it("leads with the top product name and includes the MVP scope + stack", () => {
    const out = buildScaffoldPrompt(input);
    expect(out).toContain("# Build: TokenWatch");
    expect(out).toContain("## MVP scope");
    expect(out).toContain("Ingest usage events, one dashboard, budget alerts.");
    expect(out).toContain("Next.js · tRPC · PostgreSQL");
    expect(out).toContain("## Target user");
    expect(out).toContain("Indie developers shipping AI features");
  });

  it("falls back to the title when names/ideas are sparse", () => {
    const out = buildScaffoldPrompt({
      title: "Edge inference runtimes",
      plan: {
        saasIdeas: ["A managed edge-inference platform"],
        apiIdeas: [],
        productNames: [],
        keywords: [],
        domainNames: [],
        targetAudience: "Platform teams",
        pricingHint: "Usage-based",
        mvpScope: "Deploy a model to the edge in one command.",
        techStack: [],
      },
    });
    expect(out).toContain("# Build: A managed edge-inference platform");
    expect(out).not.toContain("## Positioning"); // nothing to position with
    expect(out).not.toContain("## API surface"); // no api ideas
  });
});
