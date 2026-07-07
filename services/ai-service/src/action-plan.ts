/**
 * Action-plan generation (B-021): turn a scored trend into a concrete "what to build" plan. Goes
 * through @aioi/ai-sdk (LiteLLM in prod, deterministic stub offline); output is schema-validated by the
 * provider. Grounds the request in the trend's scores + evidence.
 */
import type { Score } from "@aioi/shared";
import { type ActionPlanContent } from "@aioi/validation";
import { getProvider, type LLMProvider } from "@aioi/ai-sdk";
import { listTopTrendsNeedingPlan, persistActionPlan } from "@aioi/database";
import { logger } from "@aioi/logger";

export const ACTION_PLAN_PROMPT_VERSION = "2026-07-05";

export interface GeneratedActionPlan {
  promptVersion: string;
  content: ActionPlanContent;
}

export async function generateActionPlan(
  trend: { title: string; summary?: string | null },
  scores: Score[],
  provider: LLMProvider = getProvider(),
): Promise<GeneratedActionPlan> {
  const scoreMap: Record<string, number> = {};
  for (const s of scores) scoreMap[s.dimension] = s.value;
  const evidenceIds = [...new Set(scores.flatMap((s) => s.evidence))].slice(0, 10);

  const content = await provider.generateActionPlan({
    trendTitle: trend.title,
    trendSummary: trend.summary ?? undefined,
    scores: scoreMap,
    evidenceIds: evidenceIds.length > 0 ? evidenceIds : ["none"],
  });

  return { promptVersion: ACTION_PLAN_PROMPT_VERSION, content };
}

/**
 * Auto-generate + persist action plans for the top scored trends that don't have one yet — the last
 * step of the autonomous pipeline (ingest → cluster → score → **plan**). Idempotent: already-planned
 * trends are skipped, so repeated runs only plan new top trends. Uses the Stub unless a provider/key is
 * configured. `minOpportunity` focuses spend on worthwhile trends.
 */
export async function generateActionPlansForTopTrends(
  opts: { limit?: number; minOpportunity?: number; provider?: LLMProvider } = {},
): Promise<{ candidates: number; generated: number }> {
  const trends = await listTopTrendsNeedingPlan(opts.limit ?? 10, opts.minOpportunity ?? 0);
  const provider = opts.provider ?? getProvider();
  let generated = 0;
  for (const t of trends) {
    try {
      const plan = await generateActionPlan(
        { title: t.title, summary: t.summary },
        t.scores,
        provider,
      );
      await persistActionPlan(t.id, plan.promptVersion, plan.content);
      generated += 1;
    } catch (err) {
      logger.warn({ err, trendId: t.id }, "action-plan generation failed for trend (skipped)");
    }
  }
  logger.info({ candidates: trends.length, generated }, "auto action-plan generation complete");
  return { candidates: trends.length, generated };
}
