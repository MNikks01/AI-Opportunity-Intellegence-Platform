import { describe, expect, it } from "vitest";
import { actionPlanContentSchema } from "@aioi/validation";
import { StubProvider } from "./index";

describe("StubProvider.generateActionPlan", () => {
  const req = { trendTitle: "Agentic RAG", scores: { opportunity: 82 }, evidenceIds: ["hn:1"] };

  it("returns deterministic, schema-valid content with non-empty SaaS ideas", async () => {
    const p = new StubProvider();
    const a = await p.generateActionPlan(req);
    const b = await p.generateActionPlan(req);
    expect(a).toEqual(b); // deterministic
    expect(() => actionPlanContentSchema.parse(a)).not.toThrow();
    expect(a.saasIdeas.length).toBeGreaterThan(0);
    expect(a.keywords[0]).toContain("agentic-rag");
  });
});
