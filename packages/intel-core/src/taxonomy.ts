/**
 * Canonical AI/tech taxonomy — the single source of truth (M2). `@aioi/database` imports the registry
 * from here for seeding; the relevance gate and classifiers reference these keys. Pure data + types, no
 * runtime dependencies. See docs/02-architecture/AI_TECH_INTELLIGENCE_MODULE.md and ADR-0009.
 */

/** Coarse geography, mirroring the `Region` Prisma enum (kept in sync by hand; both are small + stable). */
export const REGIONS = [
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

export type Region = (typeof REGIONS)[number];

export interface CategoryDef {
  key: string;
  name: string;
  /** Parent category key, for the single level of nesting the schema allows. */
  parentKey?: string;
}

/**
 * The canonical AI/tech category set (from the module brief). Flat for now; `parentKey` is supported so
 * sub-categories can be added later without a migration. Keys are stable slugs — never renamed (they are
 * referenced by `Source.defaultCategoryKey`, API filters, and saved searches).
 */
export const CATEGORY_REGISTRY: readonly CategoryDef[] = [
  { key: "ai-models", name: "AI Models" },
  { key: "coding-ai", name: "Coding AI" },
  { key: "research-ai", name: "Research AI" },
  { key: "presentation-ai", name: "Presentation AI" },
  { key: "video-ai", name: "Video AI" },
  { key: "image-ai", name: "Image AI" },
  { key: "voice-ai", name: "Voice AI" },
  { key: "ai-agents", name: "AI Agents" },
  { key: "robotics", name: "Robotics" },
  { key: "startups", name: "Startups" },
  { key: "big-tech", name: "Big Tech" },
  { key: "government", name: "Government" },
  { key: "investments", name: "Investments" },
  { key: "open-source", name: "Open Source" },
  { key: "research-papers", name: "Research Papers" },
  { key: "developer-tools", name: "Developer Tools" },
  { key: "cloud", name: "Cloud" },
  { key: "hardware", name: "Hardware" },
] as const;

/** Every valid category key, for O(1) membership checks. */
export const CATEGORY_KEYS: ReadonlySet<string> = new Set(CATEGORY_REGISTRY.map((c) => c.key));

/** Type guard: is this a known category key? */
export function isCategoryKey(key: string): boolean {
  return CATEGORY_KEYS.has(key);
}
