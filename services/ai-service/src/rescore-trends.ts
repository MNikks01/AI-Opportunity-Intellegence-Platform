/**
 * Opt-in backfill re-scoring. The autonomous pipeline only scores *new* (unscored) trends, so trends
 * scored during the Stub era keep their heuristic scores when a real model is later configured. This
 * re-scores existing trends with the current provider, overwriting in place (same RUBRIC_VERSION → no
 * duplicate rows). Batched + queue-rotating so a full backfill is done incrementally, under cost control.
 */
import { type LLMProvider } from "@aioi/ai-sdk";
import {
  listTrendsForRescore,
  persistScoresForTrend,
  touchTrend,
  countScoredTrends,
} from "@aioi/database";
import { logger } from "@aioi/logger";
import { scoreTrend } from "./scoring";
import { toTrendLike } from "./score-trends";

export async function rescoreTrends(
  opts: { limit?: number; provider?: LLMProvider } = {},
): Promise<{ picked: number; rescored: number; totalScored: number }> {
  const trends = await listTrendsForRescore(opts.limit ?? 25);
  let rescored = 0;
  for (const t of trends) {
    try {
      const scores = await scoreTrend(toTrendLike(t), { provider: opts.provider });
      await persistScoresForTrend({ id: t.id, title: t.title, summary: t.summary }, scores);
      await touchTrend(t.id); // rotate to the back of the queue so the next batch moves on
      rescored += 1;
    } catch (err) {
      logger.warn({ err, trendId: t.id }, "rescore failed for trend (skipped)");
    }
  }
  const totalScored = await countScoredTrends();
  logger.info({ picked: trends.length, rescored, totalScored }, "rescore batch complete");
  return { picked: trends.length, rescored, totalScored };
}
