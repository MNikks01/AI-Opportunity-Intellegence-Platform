import { describe, expect, it } from "vitest";
import { CATEGORY_REGISTRY, getCategoryByKey, listCategories, seedCategories } from "./taxonomy";

// Integration test — needs a live Postgres. Category is a global table, so no org context is required.
const hasDb = Boolean(process.env.DATABASE_URL);

describe("CATEGORY_REGISTRY (pure)", () => {
  it("has unique, slug-shaped keys", () => {
    const keys = CATEGORY_REGISTRY.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) expect(key).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it("references only known parent keys", () => {
    const keys = new Set(CATEGORY_REGISTRY.map((c) => c.key));
    for (const c of CATEGORY_REGISTRY) {
      if (c.parentKey) expect(keys.has(c.parentKey)).toBe(true);
    }
  });
});

describe.skipIf(!hasDb)("category taxonomy (integration)", () => {
  it("seeds idempotently and is re-runnable without duplicating rows", async () => {
    const count = await seedCategories();
    expect(count).toBe(CATEGORY_REGISTRY.length);

    const first = await listCategories();
    // Every registry key is present after seeding.
    for (const def of CATEGORY_REGISTRY) {
      expect(first.some((c) => c.key === def.key)).toBe(true);
    }

    // Re-running does not create duplicates (upsert by key).
    await seedCategories();
    const second = await listCategories();
    const seededKeys = new Set(CATEGORY_REGISTRY.map((c) => c.key));
    const firstSeeded = first.filter((c) => seededKeys.has(c.key));
    const secondSeeded = second.filter((c) => seededKeys.has(c.key));
    expect(secondSeeded.length).toBe(firstSeeded.length);
  });

  it("looks up a category by its stable key", async () => {
    await seedCategories();
    const cat = await getCategoryByKey("ai-models");
    expect(cat).not.toBeNull();
    expect(cat!.name).toBe("AI Models");

    const missing = await getCategoryByKey("does-not-exist");
    expect(missing).toBeNull();
  });
});
