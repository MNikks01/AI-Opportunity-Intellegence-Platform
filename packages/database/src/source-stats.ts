/**
 * Connector health: per-source ingestion stats (signal counts + last-ingested time). Source/Signal are
 * global tables (no RLS), so this is a system/admin view, not tenant-scoped.
 */
import { prisma } from "./client";
import { getLatestRuns, type LatestRun } from "./ingestion-runs";

export interface SourceStat {
  source: string;
  legalityTier: string;
  signalCount: number;
  lastFetchedAt: Date | null;
  lastRun: LatestRun | null;
}

export async function getSourceStats(): Promise<SourceStat[]> {
  const [rows, latestRuns] = await Promise.all([
    prisma.source.findMany({
      select: {
        key: true,
        legalityTier: true,
        _count: { select: { signals: true } },
        signals: { select: { fetchedAt: true }, orderBy: { fetchedAt: "desc" }, take: 1 },
      },
      orderBy: { key: "asc" },
    }),
    getLatestRuns(),
  ]);
  return rows.map((r) => ({
    source: r.key,
    legalityTier: r.legalityTier,
    signalCount: r._count.signals,
    lastFetchedAt: r.signals[0]?.fetchedAt ?? null,
    lastRun: latestRuns.get(r.key) ?? null,
  }));
}
