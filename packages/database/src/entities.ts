/**
 * Entity directory (B-006/B-021): the companies / models / tools / people that recur across trends.
 * Entities + Trend↔Entity links are global (public) tables — extraction happens in the pipeline
 * (@aioi/ai-service). No unique constraint on (type,name), so upsertEntity de-dupes by find-then-create
 * (safe under the single-threaded refresh).
 */
import type { $Enums, Prisma } from "@prisma/client";
import { bandForValue, type ScoreBand } from "@aioi/shared";
import { prisma } from "./client";

export type EntityType = $Enums.EntityType;

export interface EntityListItem {
  id: string;
  type: EntityType;
  name: string;
  trendCount: number;
}

export interface EntityTrend {
  slug: string;
  title: string;
  opportunity: number | null;
  band: ScoreBand | null;
}

/** Find-or-create an entity by (type, name). Returns its id. */
export async function upsertEntity(
  type: EntityType,
  name: string,
  externalRefs: Record<string, unknown> = {},
): Promise<string> {
  const existing = await prisma.entity.findFirst({ where: { type, name }, select: { id: true } });
  if (existing) return existing.id;
  const created = await prisma.entity.create({
    data: { type, name, externalRefs: externalRefs as Prisma.InputJsonValue },
    select: { id: true },
  });
  return created.id;
}

/** Link a trend to an entity (idempotent on the composite key). */
export async function linkTrendEntity(
  trendId: string,
  entityId: string,
  role?: string,
): Promise<void> {
  await prisma.trendEntity.upsert({
    where: { trendId_entityId: { trendId, entityId } },
    create: { trendId, entityId, role },
    update: {},
  });
}

/** Entities that appear in ≥1 trend, most-mentioned first (optionally filtered by type). */
export async function listEntities(
  opts: { type?: EntityType; limit?: number } = {},
): Promise<EntityListItem[]> {
  const rows = await prisma.entity.findMany({
    where: opts.type ? { type: opts.type } : undefined,
    include: { _count: { select: { trends: true } } },
    take: opts.limit ?? 300,
  });
  return rows
    .map((e) => ({ id: e.id, type: e.type, name: e.name, trendCount: e._count.trends }))
    .filter((e) => e.trendCount > 0)
    .sort((a, b) => b.trendCount - a.trendCount || a.name.localeCompare(b.name));
}

export function getEntityById(id: string) {
  return prisma.entity.findUnique({
    where: { id },
    select: { id: true, type: true, name: true, externalRefs: true },
  });
}

/** Trends mentioning an entity, highest opportunity first. */
export async function listTrendsForEntity(entityId: string, limit = 100): Promise<EntityTrend[]> {
  const rows = await prisma.trendEntity.findMany({
    where: { entityId },
    take: limit,
    include: {
      trend: {
        select: {
          slug: true,
          title: true,
          scores: { where: { dimension: "OPPORTUNITY" }, select: { value: true }, take: 1 },
        },
      },
    },
  });
  return rows
    .map((r) => {
      const opportunity = r.trend.scores[0]?.value ?? null;
      return {
        slug: r.trend.slug,
        title: r.trend.title,
        opportunity,
        band: opportunity !== null ? bandForValue(opportunity) : null,
      };
    })
    .sort((a, b) => (b.opportunity ?? -1) - (a.opportunity ?? -1));
}

/** The entities linked to a trend (for the trend detail page). */
export async function getTrendEntities(
  trendId: string,
): Promise<{ id: string; type: EntityType; name: string }[]> {
  const rows = await prisma.trendEntity.findMany({
    where: { trendId },
    include: { entity: { select: { id: true, type: true, name: true } } },
  });
  return rows.map((r) => r.entity);
}

export interface RelatedTrend {
  slug: string;
  title: string;
  opportunity: number | null;
  band: ScoreBand | null;
  shared: number;
}

/**
 * Trends that share ≥1 entity with the given trend (excluding itself), ranked by number of shared
 * entities then opportunity. Deterministic "related" — works from the dictionary links, no embeddings.
 */
export async function getRelatedTrends(trendId: string, limit = 6): Promise<RelatedTrend[]> {
  const rows = await prisma.$queryRaw<
    Array<{ slug: string; title: string; shared: number; opportunity: number | null }>
  >`
    SELECT t.slug, t.title,
           COUNT(DISTINCT te2."entityId")::int AS shared,
           MAX(CASE WHEN s.dimension = 'OPPORTUNITY' THEN s.value END) AS opportunity
    FROM "TrendEntity" te1
    JOIN "TrendEntity" te2 ON te2."entityId" = te1."entityId" AND te2."trendId" <> te1."trendId"
    JOIN "Trend" t ON t.id = te2."trendId"
    LEFT JOIN "Score" s ON s."trendId" = t.id
    WHERE te1."trendId" = ${trendId}::uuid
    GROUP BY t.id, t.slug, t.title
    ORDER BY shared DESC, opportunity DESC NULLS LAST
    LIMIT ${limit}`;
  return rows.map((r) => {
    const opportunity = r.opportunity !== null ? Number(r.opportunity) : null;
    return {
      slug: r.slug,
      title: r.title,
      shared: Number(r.shared),
      opportunity,
      band: opportunity !== null ? bandForValue(opportunity) : null,
    };
  });
}

/** Trends with no entity links yet + their combined text, for the extraction step (newest first). */
export async function listTrendsForEntityExtraction(
  limit = 200,
): Promise<{ id: string; text: string }[]> {
  const rows = await prisma.trend.findMany({
    where: { entities: { none: {} } },
    take: limit,
    orderBy: { lastSignalAt: "desc" },
    select: {
      id: true,
      title: true,
      summary: true,
      signals: { take: 8, select: { signal: { select: { title: true } } } },
    },
  });
  return rows.map((t) => ({
    id: t.id,
    text: [t.title, t.summary ?? "", ...t.signals.map((s) => s.signal.title ?? "")].join(" \n "),
  }));
}
