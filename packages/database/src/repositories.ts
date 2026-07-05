/**
 * Data-access layer. Maps between the domain model (@aioi/shared, lowercase dims) and the Prisma
 * enums (UPPER_SNAKE). Services depend on these functions, not on Prisma directly.
 */
import type { $Enums } from "@prisma/client";
import type { Score, ScoreBand, ScoreDimension, TrendLike, TrendStatus } from "@aioi/shared";
import { bandForValue } from "@aioi/shared";
import { prisma } from "./client";
import { evaluateTrendAllOrgs } from "./alerts";

// ── enum maps ────────────────────────────────────────────────────────────────
const DIM_TO_DB: Record<ScoreDimension, $Enums.ScoreDimension> = {
  opportunity: "OPPORTUNITY",
  business: "BUSINESS",
  developer: "DEVELOPER",
  creator: "CREATOR",
  seo: "SEO",
  competition: "COMPETITION",
  monetization: "MONETIZATION",
  risk: "RISK",
  difficulty: "DIFFICULTY",
  predictedLifetime: "PREDICTED_LIFETIME",
};
const DIM_FROM_DB = Object.fromEntries(Object.entries(DIM_TO_DB).map(([k, v]) => [v, k])) as Record<
  $Enums.ScoreDimension,
  ScoreDimension
>;

const BAND_TO_DB: Record<ScoreBand, $Enums.ScoreBand> = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
};
const BAND_FROM_DB: Record<$Enums.ScoreBand, ScoreBand> = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
};

// ── writes ───────────────────────────────────────────────────────────────────
export async function ensureSource(key: string): Promise<string> {
  const source = await prisma.source.upsert({
    where: { key },
    create: { key, legalityTier: "OFFICIAL", rateConfig: {} },
    update: {},
  });
  return source.id;
}

/** Upsert a trend, its signals, and its scorecard. Idempotent by trend slug + signal (source,externalId). */
export async function persistScoredTrend(trend: TrendLike, scores: Score[]): Promise<string> {
  const now = new Date();

  const dbTrend = await prisma.trend.upsert({
    where: { slug: trend.slug },
    create: {
      slug: trend.slug,
      title: trend.title,
      summary: trend.summary,
      status: trend.status,
      lastSignalAt: now,
    },
    update: { title: trend.title, summary: trend.summary, status: trend.status, lastSignalAt: now },
  });

  for (const sig of trend.signals) {
    const sourceId = await ensureSource(sig.source);
    const signal = await prisma.signal.upsert({
      where: { sourceId_externalId: { sourceId, externalId: sig.externalId } },
      create: { sourceId, externalId: sig.externalId, url: sig.url, title: sig.title, raw: {} },
      update: { title: sig.title, url: sig.url },
    });
    await prisma.trendSignal.upsert({
      where: { trendId_signalId: { trendId: dbTrend.id, signalId: signal.id } },
      create: { trendId: dbTrend.id, signalId: signal.id },
      update: {},
    });
  }

  for (const s of scores) {
    await prisma.score.upsert({
      where: {
        trendId_dimension_rubricVersion: {
          trendId: dbTrend.id,
          dimension: DIM_TO_DB[s.dimension]!,
          rubricVersion: s.rubricVersion,
        },
      },
      create: {
        trendId: dbTrend.id,
        dimension: DIM_TO_DB[s.dimension]!,
        value: s.value,
        band: BAND_TO_DB[s.band]!,
        confidence: s.confidence,
        rationale: s.rationale,
        evidence: s.evidence,
        rubricVersion: s.rubricVersion,
      },
      update: {
        value: s.value,
        band: BAND_TO_DB[s.band]!,
        confidence: s.confidence,
        rationale: s.rationale,
      },
    });
  }

  // Auto-evaluate alerts for every org watching this trend (B-017 pipeline). No-op if unwatched.
  const scoreMap: Record<string, number> = {};
  for (const s of scores) scoreMap[s.dimension] = s.value;
  await evaluateTrendAllOrgs({ trendId: dbTrend.id, title: trend.title, scores: scoreMap });

  return dbTrend.id;
}

// ── reads (return API/domain shape) ──────────────────────────────────────────
export interface TrendView {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  status: TrendStatus;
  scores: Score[];
}

function toScore(row: {
  dimension: $Enums.ScoreDimension;
  value: number;
  band: $Enums.ScoreBand;
  confidence: number;
  rationale: string;
  evidence: unknown;
  rubricVersion: string;
}): Score {
  return {
    dimension: DIM_FROM_DB[row.dimension]!,
    value: row.value,
    band: BAND_FROM_DB[row.band] ?? bandForValue(row.value),
    confidence: row.confidence,
    rationale: row.rationale,
    evidence: Array.isArray(row.evidence) ? (row.evidence as string[]) : [],
    rubricVersion: row.rubricVersion,
  };
}

export async function listTrends(limit = 25): Promise<TrendView[]> {
  const rows = await prisma.trend.findMany({
    take: limit,
    orderBy: { lastSignalAt: "desc" },
    include: { scores: true },
  });
  return rows.map((t) => ({
    id: t.id,
    slug: t.slug,
    title: t.title,
    summary: t.summary,
    status: t.status as TrendStatus,
    scores: t.scores.map(toScore),
  }));
}

export async function getTrendBySlug(slug: string): Promise<TrendView | null> {
  const t = await prisma.trend.findUnique({ where: { slug }, include: { scores: true } });
  if (!t) return null;
  return {
    id: t.id,
    slug: t.slug,
    title: t.title,
    summary: t.summary,
    status: t.status as TrendStatus,
    scores: t.scores.map(toScore),
  };
}
