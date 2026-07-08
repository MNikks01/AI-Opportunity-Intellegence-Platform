import { prisma } from "./client";

export type MomentumState = "new" | "accelerating" | "steady" | "cooling";

export interface TrendMomentum {
  trendId: string;
  current: number; // latest signal count
  delta: number; // change vs ~7-day baseline (or earliest snapshot)
  pct: number | null; // percent change, null when baseline is 0
  state: MomentumState;
  spark: number[]; // recent signal-count history for a sparkline
}

/**
 * Write one history point per trend — call at the end of each pipeline run. This is the raw material
 * for momentum; it is only useful once ≥2 runs have accrued, so start recording early.
 */
export async function recordTrendSnapshots(): Promise<{ count: number }> {
  const trends = await prisma.trend.findMany({
    select: {
      id: true,
      _count: { select: { signals: true } },
      scores: { where: { dimension: "OPPORTUNITY" }, select: { value: true }, take: 1 },
    },
  });
  if (trends.length === 0) return { count: 0 };
  await prisma.trendSnapshot.createMany({
    data: trends.map((t) => ({
      trendId: t.id,
      signalCount: t._count.signals,
      opportunity: t.scores[0]?.value ?? null,
    })),
  });
  return { count: trends.length };
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Momentum per trend from snapshot history. Trends with 0–1 snapshots are reported as "new". */
export async function getTrendMomentumMap(trendIds: string[]): Promise<Map<string, TrendMomentum>> {
  if (trendIds.length === 0) return new Map();
  const snaps = await prisma.trendSnapshot.findMany({
    where: { trendId: { in: trendIds } },
    orderBy: { capturedAt: "asc" },
    select: { trendId: true, signalCount: true, capturedAt: true },
  });
  const byTrend = new Map<string, { c: number; at: Date }[]>();
  for (const s of snaps) {
    const arr = byTrend.get(s.trendId) ?? [];
    arr.push({ c: s.signalCount, at: s.capturedAt });
    byTrend.set(s.trendId, arr);
  }
  const out = new Map<string, TrendMomentum>();
  for (const [trendId, arr] of byTrend) {
    const last = arr[arr.length - 1];
    const first = arr[0];
    if (!last || !first) continue;
    const current = last.c;
    const spark = arr.slice(-12).map((x) => x.c);
    if (arr.length < 2) {
      out.set(trendId, { trendId, current, delta: 0, pct: null, state: "new", spark });
      continue;
    }
    // Baseline = the most recent snapshot at least a week old; else the earliest we have.
    const target = last.at.getTime() - WEEK_MS;
    let baseline = first;
    for (const x of arr) if (x.at.getTime() <= target) baseline = x;
    const delta = current - baseline.c;
    const pct = baseline.c > 0 ? Math.round((delta / baseline.c) * 100) : null;
    const state: MomentumState = delta > 0 ? "accelerating" : delta < 0 ? "cooling" : "steady";
    out.set(trendId, { trendId, current, delta, pct, state, spark });
  }
  return out;
}
