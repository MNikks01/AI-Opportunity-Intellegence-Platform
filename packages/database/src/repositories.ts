/**
 * Data-access layer. Maps between the domain model (@aioi/shared, lowercase dims) and the Prisma
 * enums (UPPER_SNAKE). Services depend on these functions, not on Prisma directly.
 */
import type { $Enums, Prisma } from "@prisma/client";
import type { Score, ScoreBand, ScoreDimension, TrendLike, TrendStatus } from "@aioi/shared";
import { bandForValue } from "@aioi/shared";
import { getEmbedder } from "@aioi/ai-sdk";
import { prisma } from "./client";
import { evaluateTrendAllOrgs } from "./alerts";

/** pgvector literal for a bound `::vector` param, e.g. [0.1,0.2] → "[0.1,0.2]". */
function vectorLiteral(nums: number[]): string {
  return `[${nums.join(",")}]`;
}

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
/** Member emails for an org (Membership has no RLS) — for system delivery jobs (scheduler). */
export async function listOrgMemberEmails(orgId: string): Promise<string[]> {
  const members = await prisma.membership.findMany({
    where: { organizationId: orgId },
    include: { user: { select: { email: true } } },
  });
  return members.map((m) => m.user.email);
}

/** Active (non-deleted) org ids — for system fan-out jobs (scheduler). Organization has no RLS. */
export async function listActiveOrgIds(limit = 1000): Promise<string[]> {
  const orgs = await prisma.organization.findMany({
    where: { deletedAt: null },
    select: { id: true },
    take: limit,
  });
  return orgs.map((o) => o.id);
}

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

  // Backfill the semantic embedding (B-019) so the trend is searchable by meaning.
  const [embedding] = await getEmbedder().embed([`${trend.title}\n${trend.summary ?? ""}`]);
  if (embedding) {
    await prisma.$executeRaw`UPDATE "Trend" SET embedding = ${vectorLiteral(embedding)}::vector WHERE id = ${dbTrend.id}::uuid`;
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
  /** Populated by getTrendBySlug (B-021); undefined in list views. */
  actionPlan?: { promptVersion: string; content: unknown } | null;
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
  const t = await prisma.trend.findUnique({
    where: { slug },
    include: { scores: true, actionPlan: true },
  });
  if (!t) return null;
  return {
    id: t.id,
    slug: t.slug,
    title: t.title,
    summary: t.summary,
    status: t.status as TrendStatus,
    scores: t.scores.map(toScore),
    actionPlan: t.actionPlan
      ? { promptVersion: t.actionPlan.promptVersion, content: t.actionPlan.content }
      : null,
  };
}

/** Upsert a trend's action plan (B-021). One plan per trend (unique trendId). */
export async function persistActionPlan(
  trendId: string,
  promptVersion: string,
  content: unknown,
): Promise<string> {
  const plan = await prisma.actionPlan.upsert({
    where: { trendId },
    create: { trendId, promptVersion, content: content as Prisma.InputJsonValue },
    update: { promptVersion, content: content as Prisma.InputJsonValue },
  });
  return plan.id;
}

export function getActionPlan(trendId: string) {
  return prisma.actionPlan.findUnique({ where: { trendId } });
}

/**
 * Keyword full-text search over trends (B-019). Uses the STORED `searchVector` (GIN-indexed) with
 * `plainto_tsquery`, ranked by `ts_rank` then recency. Returns the same `TrendView` shape as
 * `listTrends`. Semantic (pgvector) search is a follow-up. Trends are global → public.
 */
export async function searchTrends(query: string, limit = 25): Promise<TrendView[]> {
  const q = query.trim();
  if (!q) return [];
  const matches = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM "Trend"
    WHERE "searchVector" @@ plainto_tsquery('english', ${q})
    ORDER BY ts_rank("searchVector", plainto_tsquery('english', ${q})) DESC,
             "lastSignalAt" DESC NULLS LAST
    LIMIT ${limit}`;
  if (matches.length === 0) return [];

  const order = new Map(matches.map((m, i) => [m.id, i]));
  const rows = await prisma.trend.findMany({
    where: { id: { in: matches.map((m) => m.id) } },
    include: { scores: true },
  });
  return rows
    .sort((a, b) => order.get(a.id)! - order.get(b.id)!)
    .map((t) => ({
      id: t.id,
      slug: t.slug,
      title: t.title,
      summary: t.summary,
      status: t.status as TrendStatus,
      scores: t.scores.map(toScore),
    }));
}

/**
 * Semantic search over trends (B-019): embed the query and rank by cosine distance (`<=>`, HNSW index).
 * Trends without an embedding are skipped. Returns the `TrendView` shape. Quality depends on the
 * configured embedder (deterministic Stub offline; real vectors when LiteLLM is configured).
 */
export async function semanticSearchTrends(query: string, limit = 25): Promise<TrendView[]> {
  const q = query.trim();
  if (!q) return [];
  const [embedding] = await getEmbedder().embed([q]);
  if (!embedding) return [];

  const matches = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM "Trend"
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${vectorLiteral(embedding)}::vector
    LIMIT ${limit}`;
  if (matches.length === 0) return [];

  const order = new Map(matches.map((m, i) => [m.id, i]));
  const rows = await prisma.trend.findMany({
    where: { id: { in: matches.map((m) => m.id) } },
    include: { scores: true },
  });
  return rows
    .sort((a, b) => order.get(a.id)! - order.get(b.id)!)
    .map((t) => ({
      id: t.id,
      slug: t.slug,
      title: t.title,
      summary: t.summary,
      status: t.status as TrendStatus,
      scores: t.scores.map(toScore),
    }));
}
