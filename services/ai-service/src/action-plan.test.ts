import { describe, expect, it } from "vitest";
import type { Score } from "@aioi/shared";
import { generateActionPlan, ACTION_PLAN_PROMPT_VERSION } from "./action-plan";

const scores: Score[] = [
  {
    dimension: "opportunity",
    value: 84,
    band: "high",
    confidence: 0.7,
    rationale: "r",
    evidence: ["hn:1", "hn:2"],
    rubricVersion: "2026-07-01",
  },
];

describe("generateActionPlan (stub provider)", () => {
  it("returns a versioned, schema-valid plan grounded in the trend", async () => {
    const plan = await generateActionPlan(
      { title: "Vector databases", summary: "pgvector at scale" },
      scores,
    );
    expect(plan.promptVersion).toBe(ACTION_PLAN_PROMPT_VERSION);
    expect(plan.content.saasIdeas.length).toBeGreaterThan(0);
    expect(plan.content.techStack).toContain("PostgreSQL");
  });
});
