/**
 * Action-plan generation (B-021): turn a scored trend into a concrete "what to build" plan. Goes
 * through @aioi/ai-sdk (LiteLLM in prod, deterministic stub offline); output is schema-validated by the
 * provider. Grounds the request in the trend's scores + evidence.
 */
import type { Score } from "@aioi/shared";
import { type ActionPlanContent } from "@aioi/validation";
import { getProvider, type LLMProvider } from "@aioi/ai-sdk";

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
