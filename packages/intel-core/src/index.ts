/**
 * @aioi/intel-core — AI & Tech Intelligence core (M2). Pure normalization, dedupe, taxonomy, and the
 * rules-based relevance gate. No network, no DB; safe to import from any layer.
 */
export {
  REGIONS,
  type Region,
  type CategoryDef,
  CATEGORY_REGISTRY,
  CATEGORY_KEYS,
  isCategoryKey,
} from "./taxonomy";

export { cleanText, canonicalUrl, contentHash, detectLanguage } from "./normalize";

export { shingles, jaccard, isNearDuplicate, cosineSimilarity } from "./dedupe";

export { classifyByRules, type RelevanceResult, type CategoryHit } from "./relevance";

export { parseNlQuery, type ParsedQuery } from "./query";
