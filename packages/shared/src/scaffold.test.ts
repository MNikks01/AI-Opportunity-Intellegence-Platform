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
  it("emits the structured brief: role, task with product name, standards + definition of done", () => {
    const out = buildScaffoldPrompt(input);
    expect(out).toContain("# ROLE");
    expect(out).toContain("# TASK\nScaffold and build a production-ready MVP of **TokenWatch**");
    expect(out).toContain("A user can: Ingest usage events, one dashboard, budget alerts.");
    expect(out).toContain("# TECH STACK\nNext.js · tRPC · PostgreSQL");
    expect(out).toContain("# TARGET USERS\nIndie developers shipping AI features");
    expect(out).toContain("# CODING STANDARDS");
    expect(out).toContain("# SECURITY");
    expect(out).toContain("# DEFINITION OF DONE");
    expect(out).toContain("Correctness → Security → Maintainability");
  });

  it("falls back gracefully when names/ideas/stack are sparse", () => {
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
    expect(out).toContain("**A managed edge-inference platform**"); // task falls back to top idea
    expect(out).toContain("Propose a modern, type-safe stack"); // empty stack → guidance
    expect(out).not.toContain("# POSITIONING"); // no names/domains/keywords
  });
});
