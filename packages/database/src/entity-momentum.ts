/**
 * Supply-side tracking (M15-A / ADR-0005). The supply mirror of `momentum.ts`: entities of the tracked
 * types (models / MCP servers / repos) get an append-only `EntitySnapshot` history, and momentum is
 * derived from it the same way trends do — velocity vs a ~7-day baseline. Pure/deterministic over DB
 * rows (no model calls), so it stays green in CI with no keys.
 */
import type { $Enums } from "@prisma/client";
import { prisma } from "./client";
import type { MomentumState } from "./momentum";

/** Entity types tracked as "supply" in v1 (ADR-0005 D2). COMPANY/PERSON are out of scope. */
export const TRACKED_ENTITY_TYPES: $Enums.EntityType[] = ["MODEL", "MCP_SERVER", "REPO"];

export interface EntityMomentum {
  entityId: string;
  current: number; // latest signalWeight
  delta: number; // change vs ~7-day baseline (or earliest snapshot)
  pct: number | null; // percent change, null when baseline is 0
  state: MomentumState;
  spark: number[]; // recent signalWeight history for a sparkline
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Pure momentum from a time-ordered series (oldest→newest) of `{ value, at }` points. Extracted so it's
 * unit-testable without a database. `<2` points → "new". Baseline = the most recent point at least a
 * week old, else the earliest point.
 */
export function computeMomentum(
  points: { value: number; at: Date }[],
): Omit<EntityMomentum, "entityId"> {
  const last = points[points.length - 1];
  const first = points[0];
  const current = last?.value ?? 0;
  const spark = points.slice(-12).map((p) => p.value);
  if (!last || !first || points.length < 2) {
    return { current, delta: 0, pct: null, state: "new", spark };
  }
  const target = last.at.getTime() - WEEK_MS;
  let baseline = first;
  for (const p of points) if (p.at.getTime() <= target) baseline = p;
  const delta = current - baseline.value;
  const pct = baseline.value > 0 ? Math.round((delta / baseline.value) * 100) : null;
  const state: MomentumState = delta > 0 ? "accelerating" : delta < 0 ? "cooling" : "steady";
  return { current, delta, pct, state, spark };
}

/**
 * Write one history point per tracked-type entity — call at the end of each pipeline run.
 * `linkedTrendCount` = trends referencing the entity; `signalWeight` = total signal count across those
 * trends (the momentum metric). Only useful once ≥2 runs accrue, so start recording early.
 */
export async function recordEntitySnapshots(): Promise<{ count: number }> {
  const entities = await prisma.entity.findMany({
    where: { type: { in: TRACKED_ENTITY_TYPES } },
    select: {
      id: true,
      trends: { select: { trend: { select: { _count: { select: { signals: true } } } } } },
    },
  });
  if (entities.length === 0) return { count: 0 };
  await prisma.entitySnapshot.createMany({
    data: entities.map((e) => ({
      entityId: e.id,
      linkedTrendCount: e.trends.length,
      signalWeight: e.trends.reduce((sum, te) => sum + te.trend._count.signals, 0),
    })),
  });
  return { count: entities.length };
}

/** Momentum per entity from snapshot history. Entities with 0–1 snapshots are reported as "new". */
export async function getEntityMomentumMap(
  entityIds: string[],
): Promise<Map<string, EntityMomentum>> {
  if (entityIds.length === 0) return new Map();
  const snaps = await prisma.entitySnapshot.findMany({
    where: { entityId: { in: entityIds } },
    orderBy: { capturedAt: "asc" },
    select: { entityId: true, signalWeight: true, capturedAt: true },
  });
  const byEntity = new Map<string, { value: number; at: Date }[]>();
  for (const s of snaps) {
    const arr = byEntity.get(s.entityId) ?? [];
    arr.push({ value: s.signalWeight, at: s.capturedAt });
    byEntity.set(s.entityId, arr);
  }
  const out = new Map<string, EntityMomentum>();
  for (const [entityId, points] of byEntity) {
    out.set(entityId, { entityId, ...computeMomentum(points) });
  }
  return out;
}

export interface TrackedEntity {
  id: string;
  type: $Enums.EntityType;
  name: string;
  linkedTrendCount: number;
  signalWeight: number;
  momentum: EntityMomentum | null;
  createdAt: Date;
}

export type TrackedSort = "momentum" | "signal" | "recent";

/**
 * The supply-side leaderboard: tracked-type entities with their latest snapshot metrics + momentum.
 * Sort by momentum (delta), current signal weight, or recency (newest entity first). Global data —
 * entities carry no tenant scope.
 */
export async function listTrackedEntities(
  opts: { type?: $Enums.EntityType; sort?: TrackedSort; limit?: number } = {},
): Promise<TrackedEntity[]> {
  const type = opts.type && TRACKED_ENTITY_TYPES.includes(opts.type) ? opts.type : undefined;
  const entities = await prisma.entity.findMany({
    where: { type: type ? type : { in: TRACKED_ENTITY_TYPES } },
    select: {
      id: true,
      type: true,
      name: true,
      createdAt: true,
      snapshots: { orderBy: { capturedAt: "desc" }, take: 1 },
    },
    take: opts.limit ?? 300,
  });
  const momentum = await getEntityMomentumMap(entities.map((e) => e.id));
  const rows: TrackedEntity[] = entities.map((e) => {
    const latest = e.snapshots[0];
    return {
      id: e.id,
      type: e.type,
      name: e.name,
      linkedTrendCount: latest?.linkedTrendCount ?? 0,
      signalWeight: latest?.signalWeight ?? 0,
      momentum: momentum.get(e.id) ?? null,
      createdAt: e.createdAt,
    };
  });
  const sort = opts.sort ?? "momentum";
  rows.sort((a, b) => {
    if (sort === "recent") return b.createdAt.getTime() - a.createdAt.getTime();
    if (sort === "signal") return b.signalWeight - a.signalWeight || a.name.localeCompare(b.name);
    // momentum: rising first, then by current signal
    const da = a.momentum?.delta ?? 0;
    const db = b.momentum?.delta ?? 0;
    return db - da || b.signalWeight - a.signalWeight || a.name.localeCompare(b.name);
  });
  return rows;
}
