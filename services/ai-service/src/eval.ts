/**
 * LLM eval harness (B-009). Runs golden cases through the AI functions and checks invariants +
 * determinism, so a regression in scoring/action-plan logic fails CI (see eval.test.ts). Uses the
 * deterministic StubProvider offline; with a real provider these same invariants gate real output, and
 * quality thresholds (graded assertions) can be layered on.
 */
import { StubProvider, type LLMProvider } from "@aioi/ai-sdk";
import { SCORE_DIMENSIONS, type TrendLike } from "@aioi/shared";
import {
  scoreSchema,
  actionPlanContentSchema,
  signalAnalysisContentSchema,
  OPPORTUNITY_AXES,
} from "@aioi/validation";
import { classifyByRules, CATEGORY_KEYS, CATEGORY_REGISTRY } from "@aioi/intel-core";
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

  // ── Per-article analysis invariants (M4) ──
  const validKeys = CATEGORY_REGISTRY.map((c) => c.key);
  const analyzeReq = {
    title: "DeepSeek releases an open-source reasoning model",
    body: "DeepSeek published weights and benchmarks for a new open-source LLM aimed at developers.",
    sourceKey: "rss:deepmind",
    regionHint: "CHINA",
    categoryHints: ["ai-models"],
    validCategoryKeys: validKeys,
  };
  const analysisA = await provider.analyzeSignal(analyzeReq);
  const analysisB = await provider.analyzeSignal(analyzeReq);
  results.push(
    check("analysis:schema-valid", signalAnalysisContentSchema.safeParse(analysisA).success),
  );
  results.push(
    check("analysis:deterministic", JSON.stringify(analysisA) === JSON.stringify(analysisB)),
  );
  results.push(
    check(
      "analysis:nine-axes-in-range",
      OPPORTUNITY_AXES.every((axis) => {
        const s = analysisA.opportunities[axis].score;
        return Number.isInteger(s) && s >= 1 && s <= 100;
      }),
    ),
  );
  results.push(
    check(
      "analysis:categories-valid",
      analysisA.categories.length > 0 &&
        analysisA.categories.every((c) => CATEGORY_KEYS.has(c.key)),
    ),
  );
  results.push(check("analysis:tldr-within-50-words", analysisA.tldr.split(/\s+/).length <= 50));
  results.push(check("analysis:actions-nonempty", analysisA.actionItems.length > 0));

  // The rules gate (guardrail 1) must let AI through and reject off-topic text.
  results.push(
    check("gate:accepts-ai", classifyByRules(analyzeReq.title, analyzeReq.body).relevant),
  );
  results.push(
    check("gate:rejects-offtopic", !classifyByRules("Local bakery wins sourdough award").relevant),
  );

  return { results, passed: results.every((r) => r.passed) };
}
