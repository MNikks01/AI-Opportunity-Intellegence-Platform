/**
 * Scoring the clustered backlog. Clustering (B-006) creates trends from signals but leaves them
 * unscored; this scores each with the opportunity engine and persists the scorecard (+ embedding +
 * alert eval), completing the autonomous pipeline: ingest → cluster → **score** → alerts/briefs.
 */
import { type LLMProvider } from "@aioi/ai-sdk";
import { listUnscoredTrends, persistScoresForTrend } from "@aioi/database";
import { logger } from "@aioi/logger";
import type { TrendLike } from "@aioi/shared";
import { scoreTrend } from "./scoring";

export async function scoreClusteredTrends(
  opts: { limit?: number; provider?: LLMProvider } = {},
): Promise<{ trends: number; scored: number }> {
  const trends = await listUnscoredTrends(opts.limit ?? 25);
  let scored = 0;
  for (const t of trends) {
    try {
      const trendLike: TrendLike = {
        id: t.id,
        slug: t.slug,
        title: t.title,
        summary: t.summary ?? undefined,
        status: t.status,
        signals: t.signals.map((ts) => ({
          source: ts.signal.source.key,
          externalId: ts.signal.externalId,
          url: ts.signal.url ?? undefined,
          title: ts.signal.title ?? undefined,
          text: ts.signal.title ?? t.title,
        })),
      };
      const scores = await scoreTrend(trendLike, { provider: opts.provider });
      await persistScoresForTrend({ id: t.id, title: t.title, summary: t.summary }, scores);
      scored += 1;
    } catch (err) {
      logger.warn({ err, trendId: t.id }, "scoring failed for trend (skipped)");
    }
  }
  logger.info({ trends: trends.length, scored }, "clustered-trend scoring complete");
  return { trends: trends.length, scored };
}
