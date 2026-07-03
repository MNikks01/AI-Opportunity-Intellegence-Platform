/**
 * @aioi/shared
 * Core domain types and the object model (Signal / Trend / Score / Entity).
 * Kept dependency-free so every package can import it.
 */

/** The ten scoring dimensions. Inverted ones (competition/risk/difficulty): high = worse. */
export const SCORE_DIMENSIONS = [
  "opportunity",
  "business",
  "developer",
  "creator",
  "seo",
  "competition",
  "monetization",
  "risk",
  "difficulty",
  "predictedLifetime",
] as const;
export type ScoreDimension = (typeof SCORE_DIMENSIONS)[number];

/** Dimensions where a high value is unfavourable for the builder. */
export const INVERTED_DIMENSIONS: readonly ScoreDimension[] = ["competition", "risk", "difficulty"];

/** Sub-dimensions that feed the composite `opportunity` score (opportunity itself excluded). */
export const SUB_DIMENSIONS: readonly ScoreDimension[] = SCORE_DIMENSIONS.filter(
  (d) => d !== "opportunity",
);

export type ScoreBand = "low" | "medium" | "high";

export interface Score {
  dimension: ScoreDimension;
  /** 0..100 raw value (used for sorting; UI shows band). */
  value: number;
  band: ScoreBand;
  /** 0..1 model-reported confidence. */
  confidence: number;
  rationale: string;
  /** Stable source/entity ids the score is grounded in. Never empty. */
  evidence: string[];
  /** Date-versioned rubric used to produce this score. */
  rubricVersion: string;
  /** For composite scores: the sub-dimensions combined. */
  composedFrom?: ScoreDimension[];
}

/** A normalized item from any data source (output of every ingestion connector). */
export interface SourceRecord {
  /** Source key, e.g. "hackernews". */
  source: string;
  /** Stable id at the source (dedupe key). */
  externalId: string;
  url?: string;
  title?: string;
  /** ISO 8601. */
  publishedAt?: string;
  /** Free text used for embedding + scoring context. */
  text: string;
  /** Original payload (validated upstream). */
  raw: unknown;
}

export type TrendStatus = "EARLY" | "ACTIVE" | "FADING" | "ARCHIVED";

export interface TrendLike {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  status: TrendStatus;
  /** Signals backing this trend (for evidence + scoring). */
  signals: Pick<SourceRecord, "source" | "externalId" | "url" | "title" | "text">[];
}

/** Band thresholds shared by every dimension (see scoring-rubric v2026-07-01). */
export function bandForValue(value: number): ScoreBand {
  if (value >= 70) return "high";
  if (value >= 40) return "medium";
  return "low";
}
