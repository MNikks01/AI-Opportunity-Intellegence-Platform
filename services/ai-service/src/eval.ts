/**
 * LLM eval harness (B-009). Runs golden cases through the AI functions and checks invariants +
 * determinism, so a regression in scoring/action-plan logic fails CI (see eval.test.ts). Uses the
 * deterministic StubProvider offline; with a real provider these same invariants gate real output, and
 * quality thresholds (graded assertions) can be layered on.
 */
import { StubProvider, type LLMProvider } from "@aioi/ai-sdk";
import { SCORE_DIMENSIONS, type TrendLike } from "@aioi/shared";
import { scoreSchema, actionPlanContentSchema } from "@aioi/validation";
import { scoreTrend } from "./scoring";
import { generateActionPlan } from "./action-plan";

export interface EvalResult {
  name: string;
  passed: boolean;
  details?: string;
}

function check(name: string, passed: boolean, details?: string): EvalResult {
  return { name, passed, ...(details ? { details } : {}) };
}

/** The golden trend — a fixed, representative input the harness scores/plans against. */
const GOLDEN_TREND: TrendLike = {
  id: "golden-1",
  slug: "mcp-servers-local-models",
  title: "MCP servers for local models",
  status: "ACTIVE",
  signals: [
    {
      source: "hackernews",
      externalId: "g1",
      title: "Show HN: local MCP",
      text: "surging interest in MCP for local LLMs",
    },
    {
      source: "github",
      externalId: "g2",
      title: "repo",
      text: "1.2k stars this week for an MCP server",
    },
  ],
};

export async function runEvalHarness(
  provider: LLMProvider = new StubProvider(),
): Promise<{ results: EvalResult[]; passed: boolean }> {
  const results: EvalResult[] = [];

  // ── Scoring invariants ──
  const scoresA = await scoreTrend(GOLDEN_TREND, { provider });
  const scoresB = await scoreTrend(GOLDEN_TREND, { provider });
  results.push(check("scoring:all-dimensions", scoresA.length === SCORE_DIMENSIONS.length));
  results.push(
    check(
      "scoring:schema-valid",
      scoresA.every((s) => scoreSchema.safeParse(s).success),
    ),
  );
  results.push(
    check(
      "scoring:values-in-range",
      scoresA.every((s) => s.value >= 0 && s.value <= 100),
    ),
  );
  results.push(
    check(
      "scoring:evidence-grounded",
      scoresA.every((s) => s.evidence.length > 0),
    ),
  );
  const opp = scoresA.find((s) => s.dimension === "opportunity");
  results.push(check("scoring:composite-opportunity", (opp?.composedFrom?.length ?? 0) === 8));
  results.push(check("scoring:deterministic", JSON.stringify(scoresA) === JSON.stringify(scoresB)));

  // ── Action-plan invariants ──
  const planA = await generateActionPlan({ title: GOLDEN_TREND.title }, scoresA, provider);
  const planB = await generateActionPlan({ title: GOLDEN_TREND.title }, scoresA, provider);
  results.push(
    check("actionplan:schema-valid", actionPlanContentSchema.safeParse(planA.content).success),
  );
  results.push(check("actionplan:nonempty-saas", planA.content.saasIdeas.length > 0));
  results.push(check("actionplan:deterministic", JSON.stringify(planA) === JSON.stringify(planB)));

  return { results, passed: results.every((r) => r.passed) };
}
