/**
 * Per-article analysis persistence (AI/tech vertical, M4). Reads the backlog of un-analyzed signals and
 * writes the 1:1 `SignalAnalysis` enrichment + its `SignalCategory` tags. Signal/SignalAnalysis are
 * global tables (no RLS). The content-hash lookup powers the ADR-0009 cache guardrail: an identical
 * article (even reposted from another source) reuses an existing analysis instead of paying for a new
 * model call. See docs/02-architecture/AI_TECH_INTELLIGENCE_MODULE.md.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "./client";

export interface SignalForAnalysis {
  id: string;
  title: string | null;
  url: string | null;
  raw: unknown;
  sourceKey: string;
  legalityTier: string;
  defaultCategoryKey: string | null;
  sourceRegion: string | null;
}

/** Signals that have no analysis yet, newest first — the analyze queue's work list. */
export async function listSignalsForAnalysis(limit = 50): Promise<SignalForAnalysis[]> {
  const rows = await prisma.signal.findMany({
    where: { analysis: null },
    take: limit,
    orderBy: { fetchedAt: "desc" },
    select: {
      id: true,
      title: true,
      url: true,
      raw: true,
      source: { select: { key: true, legalityTier: true, defaultCategoryKey: true, region: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    url: r.url,
    raw: r.raw,
    sourceKey: r.source.key,
    legalityTier: r.source.legalityTier,
    defaultCategoryKey: r.source.defaultCategoryKey,
    sourceRegion: r.source.region,
  }));
}

export interface CachedAnalysis {
  region: string;
  language: string;
  tldr: string;
  payload: unknown;
  impactScore: number;
  opportunityScore: number;
  credibilityScore: number;
}

/**
 * Look up an existing analysis for identical content + prompt version (the cache guardrail). Returns the
 * reusable fields, or null. Excludes the signal being analyzed so a row never matches itself.
 */
export async function findAnalysisByContentHash(
  contentHash: string,
  promptVersion: string,
  excludeSignalId?: string,
): Promise<CachedAnalysis | null> {
  const hit = await prisma.signalAnalysis.findFirst({
    where: {
      contentHash,
      promptVersion,
      ...(excludeSignalId ? { NOT: { signalId: excludeSignalId } } : {}),
    },
    select: {
      region: true,
      language: true,
      tldr: true,
      payload: true,
      impactScore: true,
      opportunityScore: true,
      credibilityScore: true,
    },
  });
  return hit;
}

export interface SignalAnalysisInput {
  signalId: string;
  region: string;
  language: string;
  tldr: string;
  payload: unknown;
  impactScore: number;
  opportunityScore: number;
  credibilityScore: number;
  contentHash: string;
  promptVersion: string;
  /** Category tags with the classifier's confidence; unknown keys are skipped. */
  categories: { key: string; confidence: number }[];
}

/**
 * Upsert a signal's analysis and (re)set its category tags in one transaction. Idempotent by signalId —
 * re-analysis overwrites cleanly. Returns the number of category tags actually linked (known keys).
 */
export async function upsertSignalAnalysis(input: SignalAnalysisInput): Promise<number> {
  const region = input.region as Prisma.SignalAnalysisCreateInput["region"];
  const payload = (input.payload ?? {}) as Prisma.InputJsonValue;

  // Resolve category keys → ids up front (skip unknowns), so the write stays inside one transaction.
  const keys = [...new Set(input.categories.map((c) => c.key))];
  const known = await prisma.category.findMany({
    where: { key: { in: keys } },
    select: { id: true, key: true },
  });
  const idByKey = new Map(known.map((c) => [c.key, c.id]));
  const links = input.categories
    .filter((c) => idByKey.has(c.key))
    .map((c) => ({ categoryId: idByKey.get(c.key)!, confidence: c.confidence }));

  await prisma.$transaction([
    prisma.signalAnalysis.upsert({
      where: { signalId: input.signalId },
      create: {
        signalId: input.signalId,
        region,
        language: input.language,
        tldr: input.tldr,
        payload,
        impactScore: input.impactScore,
        opportunityScore: input.opportunityScore,
        credibilityScore: input.credibilityScore,
        contentHash: input.contentHash,
        promptVersion: input.promptVersion,
      },
      update: {
        region,
        language: input.language,
        tldr: input.tldr,
        payload,
        impactScore: input.impactScore,
        opportunityScore: input.opportunityScore,
        credibilityScore: input.credibilityScore,
        contentHash: input.contentHash,
        promptVersion: input.promptVersion,
      },
    }),
    prisma.signalCategory.deleteMany({ where: { signalId: input.signalId } }),
    prisma.signalCategory.createMany({
      data: links.map((l) => ({
        signalId: input.signalId,
        categoryId: l.categoryId,
        confidence: l.confidence,
      })),
      skipDuplicates: true,
    }),
  ]);
  return links.length;
}

/** Count of signals with an analysis (telemetry / dashboards). */
export async function countAnalyzedSignals(): Promise<number> {
  return prisma.signalAnalysis.count();
}

/**
 * Realign each analysis's region to its source's region tag, for region-tagged sources (regional feeds).
 * Cheap and idempotent — no LLM — so historical rows analyzed before the source-region-authoritative
 * rule land in the right region bucket on the map. Returns the number of rows updated.
 */
export async function retagAnalysisRegionsToSource(): Promise<number> {
  return prisma.$executeRaw`
    UPDATE "SignalAnalysis" a
    SET region = s.region
    FROM "Signal" sig
    JOIN "Source" s ON s.id = sig."sourceId"
    WHERE a."signalId" = sig.id AND s.region IS NOT NULL AND a.region <> s.region`;
}
