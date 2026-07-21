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

// ── Watchlists (B-016) ──────────────────────────────────────────────────────
export const watchTargetTypeSchema = z.enum(["TREND", "ENTITY", "TOPIC"]);
export type WatchTargetType = z.infer<typeof watchTargetTypeSchema>;

export const createWatchlistSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(120),
});
export type CreateWatchlistInput = z.infer<typeof createWatchlistSchema>;

export const renameWatchlistSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120),
});
export type RenameWatchlistInput = z.infer<typeof renameWatchlistSchema>;

export const watchlistItemSchema = z.object({
  watchlistId: z.string().uuid(),
  targetType: watchTargetTypeSchema,
  targetId: z.string().min(1).max(200),
});
export type WatchlistItemInput = z.infer<typeof watchlistItemSchema>;

// ── Alerts (B-017) ──────────────────────────────────────────────────────────
/** An alert fires when a watched trend matches this trigger. */
export const alertTriggerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("NEW_TREND") }),
  z.object({
    type: z.literal("SCORE_CROSSES"),
    dimension: scoreDimensionSchema,
    gte: z.number().int().min(0).max(100),
  }),
  // Fires when a watched supply-side entity (model / MCP / repo) is accelerating (M15-A B-032).
  z.object({
    type: z.literal("ENTITY_MOMENTUM"),
    minDelta: z.number().int().min(1).default(1),
  }),
]);
export type AlertTrigger = z.infer<typeof alertTriggerSchema>;

export const alertChannelSchema = z.enum(["IN_APP", "EMAIL", "SLACK", "DISCORD", "TELEGRAM"]);
export const alertCadenceSchema = z.enum(["INSTANT", "DAILY_DIGEST"]);

export const createAlertSchema = z.object({
  watchlistId: z.string().uuid(),
  trigger: alertTriggerSchema,
  channel: alertChannelSchema.default("IN_APP"),
  cadence: alertCadenceSchema.default("INSTANT"),
});
export type CreateAlertInput = z.infer<typeof createAlertSchema>;

// ── Action plans (B-021) ────────────────────────────────────────────────────
/** The "what to build" output for a scored trend. Validated on the way out of the model. */
export const actionPlanContentSchema = z.object({
  saasIdeas: z.array(z.string().min(1)).min(1),
  apiIdeas: z.array(z.string().min(1)),
  contentIdeas: z.array(z.string().min(1)),
  keywords: z.array(z.string().min(1)),
  domainNames: z.array(z.string().min(1)),
  productNames: z.array(z.string().min(1)),
  targetAudience: z.string().min(1),
  pricingHint: z.string().min(1),
  mvpScope: z.string().min(1),
  techStack: z.array(z.string().min(1)),
});
export type ActionPlanContent = z.infer<typeof actionPlanContentSchema>;

/** LLM-extracted entities (open-ended discovery beyond the curated dictionary, B-006). */
export const ENTITY_TYPES = [
  "COMPANY",
  "MODEL",
  "REPO",
  "TOOL",
  "MCP_SERVER",
  "PAPER",
  "PERSON",
] as const;
export const extractedEntitySchema = z.object({
  name: z.string().min(1).max(80),
  type: z.enum(ENTITY_TYPES),
});
export const extractedEntitiesSchema = z.object({
  entities: z.array(extractedEntitySchema).max(12),
});
export type ExtractedEntity = z.infer<typeof extractedEntitySchema>;

// ── Per-article analysis (AI/tech vertical, M4) ─────────────────────────────
/** Region enum values — kept in sync with the `Region` Prisma enum and @aioi/intel-core REGIONS. */
export const REGION_VALUES = [
  "US",
  "CHINA",
  "INDIA",
  "EUROPE",
  "JAPAN",
  "SOUTH_KOREA",
  "SINGAPORE",
  "CANADA",
  "AUSTRALIA",
  "OTHER",
] as const;
export const regionSchema = z.enum(REGION_VALUES);
export type RegionValue = (typeof REGION_VALUES)[number];

export const difficultySchema = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]);

/** One opportunity axis: a 1–100 score with a grounded "why". The brief's 9 axes each use this shape. */
export const opportunityAxisSchema = z.object({
  score: z.number().int().min(1).max(100),
  why: z.string().min(1),
});

/** A category assignment with the model's confidence (validated against known keys in the service). */
export const analysisCategorySchema = z.object({
  key: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

/**
 * The per-article analysis the model returns (ADR-0009). Canonical numeric scores stay the 10-dimension
 * trend `Score` rows; the 9 opportunity axes here live in the SignalAnalysis payload as narrative +
 * sub-score. `tldr` is capped (~50 words) at the character level.
 */
export const signalAnalysisContentSchema = z.object({
  tldr: z.string().min(1).max(400),
  executiveSummary: z.string().min(1),
  whyItMatters: z.string().min(1),
  region: regionSchema,
  categories: z.array(analysisCategorySchema).min(1).max(6),
  companiesAffected: z.array(z.string().min(1)).max(20),
  techMentioned: z.array(z.string().min(1)).max(20),
  skillsToLearn: z.array(z.string().min(1)).max(12),
  difficulty: difficultySchema,
  industry: z.string().min(1),
  estMarketImpact: z.string().min(1),
  actionItems: z.array(z.string().min(1)).min(1).max(10),
  opportunities: z.object({
    business: opportunityAxisSchema,
    career: opportunityAxisSchema,
    learning: opportunityAxisSchema,
    content: opportunityAxisSchema,
    investment: opportunityAxisSchema,
    automation: opportunityAxisSchema,
    startup: opportunityAxisSchema,
    developer: opportunityAxisSchema,
    freelancing: opportunityAxisSchema,
  }),
  impactScore: z.number().int().min(1).max(100),
  opportunityScore: z.number().int().min(1).max(100),
  confidence: z.number().min(0).max(1),
  trendingScore: z.number().int().min(1).max(100),
});
export type SignalAnalysisContent = z.infer<typeof signalAnalysisContentSchema>;
/** The nine opportunity-axis keys, in canonical order. */
export const OPPORTUNITY_AXES = [
  "business",
  "career",
  "learning",
  "content",
  "investment",
  "automation",
  "startup",
  "developer",
  "freelancing",
] as const;

export { z };
