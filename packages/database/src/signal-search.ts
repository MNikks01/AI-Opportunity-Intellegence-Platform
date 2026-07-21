/**
 * News search over Signals (AI/tech vertical, M5). Hybrid retrieval:
 *   - lexical: Postgres FTS over the STORED `searchVector` (GIN), ranked by `ts_rank`;
 *   - semantic: pgvector cosine (`<=>`, HNSW) over the query embedding;
 *   - fused by reciprocal-rank fusion (RRF) so a hit strong in either channel surfaces.
 * All channels honor the same taxonomy filters (region / category / opportunity / recency). NL queries
 * are parsed to filters by @aioi/intel-core (no LLM); only the semantic embedding costs anything, and
 * that is one cheap embed call. Signal is a global table — public read, no org scope.
 */
import { Prisma } from "@prisma/client";
import { getEmbedder } from "@aioi/ai-sdk";
import { parseNlQuery } from "@aioi/intel-core";
import { prisma } from "./client";

/** pgvector literal for a `::vector` param, e.g. [0.1,0.2] → "[0.1,0.2]". */
function vectorLiteral(nums: number[]): string {
  return `[${nums.join(",")}]`;
}

export interface SignalSearchFilters {
  region?: string;
  categoryKey?: string;
  minOpportunity?: number;
  /** Recency window in days over COALESCE(publishedAt, fetchedAt). */
  sinceDays?: number;
}

export interface SignalHit {
  id: string;
  title: string | null;
  url: string | null;
  publishedAt: Date | null;
  sourceKey: string;
  region: string | null;
  tldr: string | null;
  opportunityScore: number | null;
  impactScore: number | null;
  categories: string[];
}

/** Build the shared filter predicates (applied identically to both channels). `a` = SignalAnalysis. */
function filterConds(f: SignalSearchFilters): Prisma.Sql[] {
  const conds: Prisma.Sql[] = [];
  if (f.region) conds.push(Prisma.sql`a."region" = ${f.region}::"Region"`);
  if (f.minOpportunity !== undefined)
    conds.push(Prisma.sql`a."opportunityScore" >= ${f.minOpportunity}`);
  if (f.sinceDays !== undefined) {
    conds.push(
      Prisma.sql`COALESCE(s."publishedAt", s."fetchedAt") >= NOW() - make_interval(days => ${f.sinceDays}::int)`,
    );
  }
  if (f.categoryKey) {
    conds.push(
      Prisma.sql`EXISTS (SELECT 1 FROM "SignalCategory" sc JOIN "Category" c ON c.id = sc."categoryId"
                         WHERE sc."signalId" = s.id AND c.key = ${f.categoryKey})`,
    );
  }
  return conds;
}

/** Lexical (FTS) signal ids, best-ranked first. */
export async function searchSignalsTextIds(
  query: string,
  f: SignalSearchFilters = {},
  limit = 25,
): Promise<string[]> {
  const q = query.trim();
  if (!q) return [];
  const where = Prisma.join(
    [Prisma.sql`s."searchVector" @@ plainto_tsquery('english', ${q})`, ...filterConds(f)],
    " AND ",
  );
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT s.id FROM "Signal" s
    LEFT JOIN "SignalAnalysis" a ON a."signalId" = s.id
    WHERE ${where}
    ORDER BY ts_rank(s."searchVector", plainto_tsquery('english', ${q})) DESC,
             COALESCE(s."publishedAt", s."fetchedAt") DESC
    LIMIT ${limit}`);
  return rows.map((r) => r.id);
}

/** Semantic (pgvector cosine) signal ids for a pre-computed query embedding, closest first. */
export async function searchSignalsSemanticIds(
  embedding: number[],
  f: SignalSearchFilters = {},
  limit = 25,
): Promise<string[]> {
  const where = Prisma.join([Prisma.sql`s.embedding IS NOT NULL`, ...filterConds(f)], " AND ");
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT s.id FROM "Signal" s
    LEFT JOIN "SignalAnalysis" a ON a."signalId" = s.id
    WHERE ${where}
    ORDER BY s.embedding <=> ${vectorLiteral(embedding)}::vector
    LIMIT ${limit}`);
  return rows.map((r) => r.id);
}

/** Reciprocal-rank fusion of ranked id lists. k dampens the contribution of low ranks (standard 60). */
export function rrf(lists: string[][], k = 60): string[] {
  const score = new Map<string, number>();
  for (const list of lists) {
    list.forEach((id, rank) => score.set(id, (score.get(id) ?? 0) + 1 / (k + rank + 1)));
  }
  return [...score.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

/** Hydrate ranked signal ids into SignalHit views, preserving rank order. */
async function hydrate(ids: string[]): Promise<SignalHit[]> {
  if (ids.length === 0) return [];
  const order = new Map(ids.map((id, i) => [id, i]));
  const rows = await prisma.signal.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      title: true,
      url: true,
      publishedAt: true,
      source: { select: { key: true } },
      analysis: {
        select: { region: true, tldr: true, opportunityScore: true, impactScore: true },
      },
      categories: { select: { category: { select: { key: true } } } },
    },
  });
  return rows
    .sort((x, y) => order.get(x.id)! - order.get(y.id)!)
    .map((r) => ({
      id: r.id,
      title: r.title,
      url: r.url,
      publishedAt: r.publishedAt,
      sourceKey: r.source.key,
      region: r.analysis?.region ?? null,
      tldr: r.analysis?.tldr ?? null,
      opportunityScore: r.analysis?.opportunityScore ?? null,
      impactScore: r.analysis?.impactScore ?? null,
      categories: r.categories.map((c) => c.category.key),
    }));
}

/**
 * Hybrid news search: embed the query once, fuse FTS + semantic by RRF, hydrate. Over-fetches each
 * channel (3× limit) before fusing so a hit ranked mid-list in one channel can still win.
 */
export async function searchSignalsHybrid(
  query: string,
  f: SignalSearchFilters = {},
  limit = 25,
): Promise<SignalHit[]> {
  const q = query.trim();
  if (!q) return [];
  const pool = limit * 3;
  const [textIds, embedding] = await Promise.all([
    searchSignalsTextIds(q, f, pool),
    getEmbedder()
      .embed([q])
      .then((v) => v[0]),
  ]);
  const semanticIds = embedding ? await searchSignalsSemanticIds(embedding, f, pool) : [];
  const fused = rrf([textIds, semanticIds]).slice(0, limit);
  return hydrate(fused);
}

/**
 * Natural-language news search: parse the phrase into filters (region/category/recency, no LLM), then
 * run the hybrid search. "What happened in China today?" → region CHINA + last-day + semantic ranking.
 */
export async function searchNews(nl: string, opts: { limit?: number } = {}): Promise<SignalHit[]> {
  const parsed = parseNlQuery(nl);
  return searchSignalsHybrid(
    parsed.text,
    { region: parsed.region, categoryKey: parsed.categoryKey, sinceDays: parsed.sinceDays },
    opts.limit ?? 25,
  );
}

/**
 * Backfill Signal embeddings with the configured embedder (only rows missing one). Embeds title + the
 * analysis TLDR when present, so an analyzed signal is searchable by its richer meaning. Returns counts.
 */
export async function reembedSignals(limit = 500): Promise<{ total: number; embedded: number }> {
  const embedder = getEmbedder();
  const rows = await prisma.$queryRaw<
    Array<{ id: string; title: string | null; tldr: string | null }>
  >(
    Prisma.sql`
      SELECT s.id, s.title, a.tldr FROM "Signal" s
      LEFT JOIN "SignalAnalysis" a ON a."signalId" = s.id
      WHERE s.embedding IS NULL
      ORDER BY s."fetchedAt" DESC
      LIMIT ${limit}`,
  );
  let embedded = 0;
  const batchSize = 64;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    let vectors: number[][];
    try {
      vectors = await embedder.embed(batch.map((r) => `${r.title ?? ""}\n${r.tldr ?? ""}`.trim()));
    } catch (err) {
      // Best-effort backfill: a failed batch is skipped, not fatal.
      void err;
      continue;
    }
    for (let j = 0; j < batch.length; j++) {
      const v = vectors[j];
      if (!v) continue;
      await prisma.$executeRaw`UPDATE "Signal" SET embedding = ${vectorLiteral(v)}::vector WHERE id = ${batch[j]!.id}::uuid`;
      embedded += 1;
    }
  }
  return { total: rows.length, embedded };
}
