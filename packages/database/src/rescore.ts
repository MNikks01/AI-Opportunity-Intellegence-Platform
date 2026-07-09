import { prisma } from "./client";

/** Select shape shared with clustered scoring — trend + its signals' source/title. */
const SCORING_SELECT = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  status: true,
  signals: {
    select: {
      signal: {
        select: { externalId: true, url: true, title: true, source: { select: { key: true } } },
      },
    },
  },
} as const;

/**
 * Trends that already have scores, stalest first — the opt-in backfill re-score queue. Ordering by
 * `updatedAt` (not used for any UI sort) lets `touchTrend` rotate a re-scored trend to the back, so
 * repeated batches make progress without a schema-level "was re-scored" marker.
 */
export function listTrendsForRescore(limit = 25) {
  return prisma.trend.findMany({
    where: { scores: { some: {} } },
    orderBy: { updatedAt: "asc" },
    take: limit,
    select: SCORING_SELECT,
  });
}

/** Bump updatedAt so a re-scored trend rotates to the back of the queue. */
export async function touchTrend(id: string): Promise<void> {
  await prisma.trend.update({ where: { id }, data: { updatedAt: new Date() } });
}

/** Count of trends that have scores — for backfill progress reporting. */
export function countScoredTrends(): Promise<number> {
  return prisma.trend.count({ where: { scores: { some: {} } } });
}
