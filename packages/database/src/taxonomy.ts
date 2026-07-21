/**
 * AI & Tech Intelligence taxonomy (M1). The canonical Category registry + an idempotent seed and read
 * helpers. Category is a global (non-tenant) table, so this is public reference data.
 *
 * The registry lives here for M1 so the module is self-contained; M2 (`packages/intel-core`) re-exports
 * it as the single source of truth for the relevance/classification layer. See
 * docs/02-architecture/AI_TECH_INTELLIGENCE_MODULE.md and ADR-0009.
 */
import { prisma } from "./client";

export interface CategoryDef {
  key: string;
  name: string;
  /** Parent category key, for the single level of nesting the schema allows. */
  parentKey?: string;
}

/**
 * The canonical AI/tech category set (from the module brief). Flat for M1; `parentKey` is supported so
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

export interface CategoryRecord {
  id: string;
  key: string;
  name: string;
  parentId: string | null;
}

/**
 * Idempotently seed the Category table from {@link CATEGORY_REGISTRY}. Safe to run on every deploy: rows
 * are upserted by `key`, and `parentId` is wired in a second pass so parent order in the registry does
 * not matter. Returns the number of categories in the registry.
 */
export async function seedCategories(): Promise<number> {
  // Pass 1: upsert every category by its stable key (name may be corrected over time).
  for (const def of CATEGORY_REGISTRY) {
    await prisma.category.upsert({
      where: { key: def.key },
      create: { key: def.key, name: def.name },
      update: { name: def.name },
    });
  }

  // Pass 2: resolve parent keys → ids now that all rows exist.
  const withParent = CATEGORY_REGISTRY.filter((d) => d.parentKey);
  if (withParent.length > 0) {
    const all = await prisma.category.findMany({ select: { id: true, key: true } });
    const idByKey = new Map(all.map((c) => [c.key, c.id]));
    for (const def of withParent) {
      const parentId = idByKey.get(def.parentKey!);
      if (parentId) {
        await prisma.category.update({ where: { key: def.key }, data: { parentId } });
      }
    }
  }

  return CATEGORY_REGISTRY.length;
}

/** List every category, ordered by name. */
export async function listCategories(): Promise<CategoryRecord[]> {
  return prisma.category.findMany({
    select: { id: true, key: true, name: true, parentId: true },
    orderBy: { name: "asc" },
  });
}

/** Look up a single category by its stable key, or null if unknown. */
export async function getCategoryByKey(key: string): Promise<CategoryRecord | null> {
  return prisma.category.findUnique({
    where: { key },
    select: { id: true, key: true, name: true, parentId: true },
  });
}
