/**
 * Data-access layer. Maps between the domain model (@aioi/shared, lowercase dims) and the Prisma
 * enums (UPPER_SNAKE). Services depend on these functions, not on Prisma directly.
 */
import { randomUUID } from "node:crypto";
import type { $Enums } from "@prisma/client";
import { Prisma } from "@prisma/client";
import type { Score, ScoreBand, ScoreDimension, TrendLike, TrendStatus } from "@aioi/shared";
import { bandForValue, sanitizeText, SCORE_DIMENSIONS } from "@aioi/shared";
import { getEmbedder } from "@aioi/ai-sdk";
import { logger } from "@aioi/logger";
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
/** Signals not yet attached to any trend (candidates for clustering, B-006). Global tables. */
export async function listUnclusteredSignals(limit = 500) {
  return prisma.signal.findMany({
    where: { trends: { none: {} } },
    take: limit,
    orderBy: { fetchedAt: "desc" },
    select: { id: true, title: true },
  });
}

/** Create a Trend from a cluster of signals + link them (B-006). Returns the trend id. */
export async function createTrendFromSignalIds(
  signalIds: string[],
  title: string,
  summary?: string,
): Promise<string> {
  // Sanitize source-derived text: a title truncated mid-emoji leaves a lone surrogate that makes the
  // Prisma engine throw "unexpected end of hex escape" on write (see sanitizeText).
  const cleanTitle = sanitizeText(title) || "Untitled trend";
  const cleanSummary = summary ? sanitizeText(summary) : summary;
  const base =
    cleanTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "trend";
  const trend = await prisma.trend.create({
    data: {
      slug: `${base}-${randomUUID().slice(0, 6)}`,
      title: cleanTitle,
      summary: cleanSummary,
      status: "EARLY",
      lastSignalAt: new Date(),
    },
  });
  await prisma.trendSignal.createMany({
    data: signalIds.map((signalId) => ({ trendId: trend.id, signalId })),
    skipDuplicates: true,
  });
  return trend.id;
}

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

  // Backfill the semantic embedding (B-019) so the trend is searchable by meaning. Best-effort: a
  // real-embedder outage/misconfig must not fail scoring persistence — the trend is simply not
  // semantically searchable until re-embedded.
  try {
    const [embedding] = await getEmbedder().embed([`${trend.title}\n${trend.summary ?? ""}`]);
    if (embedding) {
      await prisma.$executeRaw`UPDATE "Trend" SET embedding = ${vectorLiteral(embedding)}::vector WHERE id = ${dbTrend.id}::uuid`;
    }
  } catch (err) {
    logger.warn(
      { err, trendId: dbTrend.id },
      "embedding backfill failed (trend persisted without it)",
    );
  }

  // Auto-evaluate alerts for every org watching this trend (B-017 pipeline). No-op if unwatched.
  const scoreMap: Record<string, number> = {};
  for (const s of scores) scoreMap[s.dimension] = s.value;
  await evaluateTrendAllOrgs({ trendId: dbTrend.id, title: trend.title, scores: scoreMap });

  return dbTrend.id;
}

/**
 * Re-embed every trend with the currently-configured embedder (batched). Run this after switching on
 * a real embed model so existing trends (created with the Stub) become semantically searchable. A
 * failed batch is logged and skipped, never aborting the whole backfill.
 */
export async function reembedAllTrends(
  batchSize = 64,
): Promise<{ total: number; embedded: number }> {
  const embedder = getEmbedder();
  const trends = await prisma.trend.findMany({ select: { id: true, title: true, summary: true } });
  let embedded = 0;
  for (let i = 0; i < trends.length; i += batchSize) {
    const batch = trends.slice(i, i + batchSize);
    let vectors: number[][];
    try {
      vectors = await embedder.embed(batch.map((t) => `${t.title}\n${t.summary ?? ""}`));
    } catch (err) {
      logger.warn({ err, from: i, size: batch.length }, "reembed batch failed (skipped)");
      continue;
    }
    for (let j = 0; j < batch.length; j++) {
      const v = vectors[j];
      if (!v) continue;
      await prisma.$executeRaw`UPDATE "Trend" SET embedding = ${vectorLiteral(v)}::vector WHERE id = ${batch[j]!.id}::uuid`;
      embedded += 1;
    }
  }
  logger.info({ total: trends.length, embedded, embedder: embedder.name }, "reembed complete");
  return { total: trends.length, embedded };
}

/** Trends with no scorecard yet (created by clustering) — candidates for the scoring job. */
export async function listUnscoredTrends(limit = 25) {
  return prisma.trend.findMany({
    where: { scores: { none: {} } },
    take: limit,
    orderBy: { lastSignalAt: "desc" },
    select: {
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
    },
  });
}

/** Write a scorecard for an EXISTING trend (the clustering→scoring path), + embedding + alert eval. */
export async function persistScoresForTrend(
  trend: { id: string; title: string; summary: string | null },
  scores: Score[],
): Promise<void> {
  for (const s of scores) {
    await prisma.score.upsert({
      where: {
        trendId_dimension_rubricVersion: {
          trendId: trend.id,
          dimension: DIM_TO_DB[s.dimension]!,
          rubricVersion: s.rubricVersion,
        },
      },
      create: {
        trendId: trend.id,
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

  try {
    const [embedding] = await getEmbedder().embed([`${trend.title}\n${trend.summary ?? ""}`]);
    if (embedding) {
      await prisma.$executeRaw`UPDATE "Trend" SET embedding = ${vectorLiteral(embedding)}::vector WHERE id = ${trend.id}::uuid`;
    }
  } catch (err) {
    logger.warn({ err, trendId: trend.id }, "embedding backfill failed (scored without it)");
  }

  const scoreMap: Record<string, number> = {};
  for (const s of scores) scoreMap[s.dimension] = s.value;
  await evaluateTrendAllOrgs({ trendId: trend.id, title: trend.title, scores: scoreMap });
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
  /** A compact action-plan teaser for list/card views (B-021), when a plan exists. */
  plan?: { topIdea: string | null; productNames: string[] } | null;
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

type TrendRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  status: $Enums.TrendStatus;
  scores: Parameters<typeof toScore>[0][];
  actionPlan?: { content: unknown } | null;
};

function planTeaser(actionPlan?: { content: unknown } | null): TrendView["plan"] {
  if (!actionPlan) return null;
  const c = actionPlan.content as { saasIdeas?: string[]; productNames?: string[] } | undefined;
  return {
    topIdea: c?.saasIdeas?.[0] ?? null,
    productNames: (c?.productNames ?? []).slice(0, 3),
  };
}

function toTrendView(t: TrendRow): TrendView {
  return {
    id: t.id,
    slug: t.slug,
    title: t.title,
    summary: t.summary,
    status: t.status as TrendStatus,
    scores: t.scores.map(toScore),
    plan: planTeaser(t.actionPlan),
  };
}

export async function listTrends(limit = 25): Promise<TrendView[]> {
  const rows = await prisma.trend.findMany({
    take: limit,
    orderBy: { lastSignalAt: "desc" },
    include: { scores: true },
  });
  return rows.map(toTrendView);
}

/** "recent" (newest) or any score dimension (sorts by that dimension's value, highest first). */
export type TrendSort = "recent" | ScoreDimension;
const TREND_STATUSES: readonly TrendStatus[] = ["EARLY", "ACTIVE", "FADING", "ARCHIVED"];

export interface TrendPage {
  trends: TrendView[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

/**
 * Browse trends with optional source (`Source.key`) + status filters, sort (newest or by any score
 * dimension, highest first), and 1-based pagination (B-012 follow-up). Dimension-sort needs a Score row,
 * which is a to-many relation Prisma can't `orderBy`, so it orders ids via composable raw SQL then
 * hydrates. Trends are global (public). All interpolated values are bound params (injection-safe).
 */
export async function listTrendsPage(opts: {
  source?: string;
  status?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
  /** Restrict to these trend ids (e.g. the "watching" filter). An empty array → empty page. */
  ids?: string[];
}): Promise<TrendPage> {
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const pageSize = Math.min(60, Math.max(1, Math.floor(opts.pageSize ?? 24)));
  const offset = (page - 1) * pageSize;
  const source = opts.source?.trim() || undefined;
  const status = TREND_STATUSES.includes(opts.status as TrendStatus)
    ? (opts.status as $Enums.TrendStatus)
    : undefined;
  const sortDim = SCORE_DIMENSIONS.includes(opts.sort as ScoreDimension)
    ? (opts.sort as ScoreDimension)
    : null;
  const restrictIds = opts.ids;

  // An explicit empty id set (e.g. "watching" with nothing watched) → empty page, no query.
  if (restrictIds && restrictIds.length === 0) {
    return { trends: [], total: 0, page, pageSize, pageCount: 1 };
  }

  const where: Prisma.TrendWhereInput = {
    ...(source ? { signals: { some: { signal: { source: { key: source } } } } } : {}),
    ...(status ? { status } : {}),
    ...(restrictIds ? { id: { in: restrictIds } } : {}),
  };

  const total = await prisma.trend.count({ where });

  let trends: TrendView[];
  if (sortDim) {
    // Order ids by the chosen dimension's score (NULLS last), then recency, with source/status filters.
    const filters: Prisma.Sql[] = [];
    if (source) {
      filters.push(Prisma.sql`EXISTS (
        SELECT 1 FROM "TrendSignal" ts
        JOIN "Signal" sig ON sig.id = ts."signalId"
        JOIN "Source" src ON src.id = sig."sourceId"
        WHERE ts."trendId" = t.id AND src.key = ${source})`);
    }
    if (status) filters.push(Prisma.sql`t.status::text = ${status}`);
    if (restrictIds) {
      filters.push(
        Prisma.sql`t.id IN (${Prisma.join(restrictIds.map((id) => Prisma.sql`${id}::uuid`))})`,
      );
    }
    const whereSql = filters.length
      ? Prisma.sql`WHERE ${Prisma.join(filters, " AND ")}`
      : Prisma.empty;
    const idRows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT t.id FROM "Trend" t
      LEFT JOIN "Score" s ON s."trendId" = t.id AND s.dimension::text = ${sortDim.toUpperCase()}
      ${whereSql}
      ORDER BY s.value DESC NULLS LAST, t."lastSignalAt" DESC NULLS LAST
      LIMIT ${pageSize} OFFSET ${offset}`);
    const ids = idRows.map((r) => r.id);
    const rows = await prisma.trend.findMany({
      where: { id: { in: ids } },
      include: { scores: true, actionPlan: { select: { content: true } } },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    trends = ids.flatMap((id) => {
      const r = byId.get(id);
      return r ? [toTrendView(r)] : [];
    });
  } else {
    const rows = await prisma.trend.findMany({
      where,
      orderBy: { lastSignalAt: "desc" },
      skip: offset,
      take: pageSize,
      include: { scores: true, actionPlan: { select: { content: true } } },
    });
    trends = rows.map(toTrendView);
  }

  return { trends, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
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

/** A source item backing a trend — the original post/repo/video/model + its link (B-021 detail view). */
export interface TrendResource {
  id: string;
  source: string;
  title: string | null;
  url: string | null;
  publishedAt: Date | null;
  /** The connector's raw payload — powers source-specific detail (e.g. Product Hunt makers/website). */
  raw: unknown;
}

/**
 * Top scored trends that don't have an action plan yet (highest opportunity first) — the backlog for
 * auto action-plan generation (B-021). `minOpportunity` skips low-value trends. Global tables (public).
 */
export async function listTopTrendsNeedingPlan(
  limit = 10,
  minOpportunity = 0,
): Promise<{ id: string; title: string; summary: string | null; scores: Score[] }[]> {
  const idRows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT t.id
    FROM "Trend" t
    JOIN "Score" s ON s."trendId" = t.id AND s.dimension = 'OPPORTUNITY'
    LEFT JOIN "ActionPlan" ap ON ap."trendId" = t.id
    WHERE ap.id IS NULL AND s.value >= ${minOpportunity}
    ORDER BY s.value DESC NULLS LAST, t."lastSignalAt" DESC NULLS LAST
    LIMIT ${limit}`;
  const ids = idRows.map((r) => r.id);
  if (ids.length === 0) return [];
  const rows = await prisma.trend.findMany({
    where: { id: { in: ids } },
    include: { scores: true },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.flatMap((id) => {
    const t = byId.get(id);
    return t
      ? [{ id: t.id, title: t.title, summary: t.summary, scores: t.scores.map(toScore) }]
      : [];
  });
}

/** Resolve trends by id → slug/title/opportunity (for watchlist items that store a trend id). */
export async function getTrendsByIds(
  ids: string[],
): Promise<Map<string, { slug: string; title: string; opportunity: number | null }>> {
  if (ids.length === 0) return new Map();
  const rows = await prisma.trend.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      slug: true,
      title: true,
      scores: { where: { dimension: "OPPORTUNITY" }, select: { value: true }, take: 1 },
    },
  });
  return new Map(
    rows.map((r) => [
      r.id,
      { slug: r.slug, title: r.title, opportunity: r.scores[0]?.value ?? null },
    ]),
  );
}

/** The signals that make up a trend, with their source + link, newest first. Global tables (public). */
export async function getTrendResources(trendId: string, limit = 60): Promise<TrendResource[]> {
  const rows = await prisma.trendSignal.findMany({
    where: { trendId },
    take: limit,
    include: { signal: { include: { source: { select: { key: true } } } } },
  });
  return rows
    .map((r) => ({
      id: r.signal.id,
      source: r.signal.source.key,
      title: r.signal.title,
      url: r.signal.url,
      publishedAt: r.signal.publishedAt,
      raw: r.signal.raw,
    }))
    .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0));
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
