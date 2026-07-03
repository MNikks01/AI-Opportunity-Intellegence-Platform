/**
 * Opportunity scoring engine — implements the contract in
 * .claude/skills/opportunity-scoring-engine (rubric + score.schema.json).
 * - Each sub-dimension is scored via the provider (grounded, schema-valid).
 * - `opportunity` is COMPUTED from sub-scores using rubric weights (never re-guessed).
 * - Results are cacheable by (trendId, dimension, rubricVersion).
 */
import {
  SUB_DIMENSIONS,
  bandForValue,
  type Score,
  type ScoreDimension,
  type TrendLike,
} from "@aioi/shared";
import { scoreSchema } from "@aioi/validation";
import { getProvider, type LLMProvider } from "@aioi/ai-sdk";

export const RUBRIC_VERSION = "2026-07-01";

/** 0/50/100 anchor summaries per dimension (condensed from scoring-rubric.md). */
const RUBRIC_ANCHORS: Record<ScoreDimension, string> = {
  opportunity: "composite of the sub-dimensions (computed, not prompted)",
  business: "0 hobby only · 50 plausible niche · 100 large growing monetizable market",
  developer: "0 no dev relevance · 50 useful dev tool · 100 must-have, broad adoption",
  creator: "0 no content angle · 50 some potential · 100 highly shareable evergreen vein",
  seo: "0 saturated/no volume · 50 moderate beatable · 100 high volume low difficulty rising",
  competition: "0 greenfield · 50 a few players · 100 saturated well-funded (high = worse)",
  monetization: "0 no WTP · 50 some paid signal low ACV · 100 clear WTP strong recurring",
  risk: "0 durable low risk · 50 some platform/model dependency · 100 fragile legal/hype (high = worse)",
  difficulty: "0 weekend build · 50 MVP in weeks · 100 deep R&D/data moat (high = worse)",
  predictedLifetime: "0 days (fad) · 50 months (cycle) · 100 years (durable shift)",
};

/** Composite weights (rubric). Inverted dims contribute (100 - value). */
const OPPORTUNITY_WEIGHTS: Partial<Record<ScoreDimension, { w: number; invert: boolean }>> = {
  business: { w: 0.25, invert: false },
  monetization: { w: 0.15, invert: false },
  seo: { w: 0.15, invert: false },
  developer: { w: 0.1, invert: false },
  creator: { w: 0.1, invert: false },
  competition: { w: 0.1, invert: true },
  risk: { w: 0.1, invert: true },
  difficulty: { w: 0.05, invert: true },
};

export interface ScoreCache {
  get(key: string): Score | undefined;
  set(key: string, score: Score): void;
}

export class InMemoryScoreCache implements ScoreCache {
  private readonly map = new Map<string, Score>();
  get(key: string): Score | undefined {
    return this.map.get(key);
  }
  set(key: string, score: Score): void {
    this.map.set(key, score);
  }
}

export function cacheKey(trendId: string, dimension: ScoreDimension, rubricVersion: string): string {
  return `${trendId}:${dimension}:${rubricVersion}`;
}

function evidenceIdsFor(trend: TrendLike): string[] {
  return trend.signals.map((s) => `${s.source}:${s.externalId}`);
}

function contextFor(trend: TrendLike): string {
  return trend.signals.map((s) => `- ${s.title ?? ""} ${s.text}`.trim()).join("\n");
}

/** Score every dimension for a trend, computing the composite. Uses cache when provided. */
export async function scoreTrend(
  trend: TrendLike,
  opts: { provider?: LLMProvider; cache?: ScoreCache } = {},
): Promise<Score[]> {
  const provider = opts.provider ?? getProvider();
  const evidenceIds = evidenceIdsFor(trend);
  if (evidenceIds.length === 0) throw new Error("cannot score a trend with no signals");
  const context = contextFor(trend);

  const subScores: Score[] = [];
  for (const dimension of SUB_DIMENSIONS) {
    const key = cacheKey(trend.id, dimension, RUBRIC_VERSION);
    const cached = opts.cache?.get(key);
    if (cached) {
      subScores.push(cached);
      continue;
    }
    const raw = await provider.scoreDimension({
      dimension,
      trendTitle: trend.title,
      context,
      evidenceIds,
      rubricAnchor: RUBRIC_ANCHORS[dimension],
    });
    const score: Score = scoreSchema.parse({
      dimension,
      value: raw.value,
      band: bandForValue(raw.value),
      confidence: raw.confidence,
      rationale: raw.rationale,
      evidence: raw.evidence,
      rubricVersion: RUBRIC_VERSION,
    });
    opts.cache?.set(key, score);
    subScores.push(score);
  }

  const opportunity = computeOpportunity(subScores, trend);
  opts.cache?.set(cacheKey(trend.id, "opportunity", RUBRIC_VERSION), opportunity);
  return [opportunity, ...subScores];
}

/** Composite opportunity — computed from sub-scores, never prompted. */
export function computeOpportunity(subScores: Score[], trend: TrendLike): Score {
  const byDim = new Map<ScoreDimension, Score>(subScores.map((s) => [s.dimension, s]));
  let sum = 0;
  let confSum = 0;
  let confCount = 0;
  const composedFrom: ScoreDimension[] = [];
  const evidence = new Set<string>();

  for (const [dim, { w, invert }] of Object.entries(OPPORTUNITY_WEIGHTS) as [
    ScoreDimension,
    { w: number; invert: boolean },
  ][]) {
    const s = byDim.get(dim);
    if (!s) continue;
    const contribution = invert ? 100 - s.value : s.value;
    sum += w * contribution;
    confSum += s.confidence;
    confCount += 1;
    composedFrom.push(dim);
    s.evidence.forEach((e) => evidence.add(e));
  }

  const value = Math.max(0, Math.min(100, Math.round(sum)));
  const confidence = confCount > 0 ? Number((confSum / confCount).toFixed(2)) : 0.5;
  return scoreSchema.parse({
    dimension: "opportunity",
    value,
    band: bandForValue(value),
    confidence,
    rationale: `Composite of ${composedFrom.length} weighted sub-dimensions per rubric ${RUBRIC_VERSION}.`,
    evidence: evidence.size > 0 ? [...evidence].slice(0, 5) : evidenceIdsFor(trend).slice(0, 1),
    rubricVersion: RUBRIC_VERSION,
    composedFrom,
  });
}
