/**
 * AI & Tech Intelligence taxonomy persistence (M1 + M2). The canonical Category registry is owned by
 * `@aioi/intel-core` (the pure, no-DB single source of truth); this module seeds it into the global
 * Category table and provides read helpers. Category is a global (non-tenant) table, so this is public
 * reference data. See docs/02-architecture/AI_TECH_INTELLIGENCE_MODULE.md and ADR-0009.
 */
import { CATEGORY_REGISTRY, type CategoryDef } from "@aioi/intel-core";
import { prisma } from "./client";

// Re-exported so existing consumers of `@aioi/database` keep working after the SoT moved to intel-core.
export { CATEGORY_REGISTRY, type CategoryDef };

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
