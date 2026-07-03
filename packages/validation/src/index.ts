/**
 * @aioi/validation
 * Zod schemas shared across RHF, tRPC, REST, and ingestion connectors.
 * The score schema mirrors .claude/skills/opportunity-scoring-engine/references/score.schema.json.
 */
import { z } from "zod";

export const scoreDimensionSchema = z.enum([
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
]);

export const scoreBandSchema = z.enum(["low", "medium", "high"]);

/** One AI-generated score. `evidence` must be non-empty (grounded), matching the skill contract. */
export const scoreSchema = z.object({
  dimension: scoreDimensionSchema,
  value: z.number().int().min(0).max(100),
  band: scoreBandSchema,
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1),
  evidence: z.array(z.string()).min(1),
  rubricVersion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  composedFrom: z.array(scoreDimensionSchema).optional(),
});
export type ScoreInput = z.infer<typeof scoreSchema>;

/** Normalized connector output. */
export const sourceRecordSchema = z.object({
  source: z.string().min(1),
  externalId: z.string().min(1),
  url: z.string().url().optional(),
  title: z.string().optional(),
  publishedAt: z.string().datetime().optional(),
  text: z.string(),
  raw: z.unknown(),
});
export type SourceRecordInput = z.infer<typeof sourceRecordSchema>;

/** Shape the model must return for a single dimension (no band/rubricVersion — we derive/stamp those). */
export const rawModelScoreSchema = z.object({
  value: z.number().int().min(0).max(100),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1),
  evidence: z.array(z.string()).min(1),
});
export type RawModelScore = z.infer<typeof rawModelScoreSchema>;

export { z };
