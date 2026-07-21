import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "./client";
import { ensureSource } from "./repositories";

// Integration test — needs a live Postgres. Source is a global table (no org context).
const hasDb = Boolean(process.env.DATABASE_URL);
const key = `rss:tagtest-${randomUUID().slice(0, 8)}`;

describe.skipIf(!hasDb)("ensureSource source tags (integration)", () => {
  afterAll(async () => {
    await prisma.source.deleteMany({ where: { key } }).catch(() => {});
  });

  it("sets region + defaultCategoryKey on create and syncs them on re-run", async () => {
    const id1 = await ensureSource(key, "OFFICIAL", {
      region: "US",
      defaultCategoryKey: "ai-models",
    });
    const created = await prisma.source.findUnique({ where: { key } });
    expect(created?.region).toBe("US");
    expect(created?.defaultCategoryKey).toBe("ai-models");

    // Re-running the pass with updated tags syncs them (same row, tags refreshed).
    const id2 = await ensureSource(key, "OFFICIAL", {
      region: "EUROPE",
      defaultCategoryKey: "open-source",
    });
    expect(id2).toBe(id1); // idempotent by key
    const updated = await prisma.source.findUnique({ where: { key } });
    expect(updated?.region).toBe("EUROPE");
    expect(updated?.defaultCategoryKey).toBe("open-source");
  });

  it("leaves tags untouched when a later call omits them", async () => {
    await ensureSource(key, "OFFICIAL", { region: "US", defaultCategoryKey: "ai-models" });
    await ensureSource(key); // no tags — must not clear existing values
    const row = await prisma.source.findUnique({ where: { key } });
    expect(row?.region).toBe("US");
    expect(row?.defaultCategoryKey).toBe("ai-models");
  });
});
