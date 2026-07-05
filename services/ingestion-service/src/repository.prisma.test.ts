import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import type { SourceRecord } from "@aioi/shared";
import { prisma } from "@aioi/database";
import { PrismaSignalRepository } from "./repository.prisma";

// Integration — needs a live Postgres. Signal/Source are global tables (no RLS).
const hasDb = Boolean(process.env.DATABASE_URL);
const sourceKey = `hn-test-${randomUUID().slice(0, 8)}`;

function rec(externalId: string, title: string): SourceRecord {
  return {
    source: sourceKey,
    externalId,
    url: `https://news.ycombinator.com/item?id=${externalId}`,
    title,
    text: title,
    raw: { id: externalId },
  };
}

describe.skipIf(!hasDb)("PrismaSignalRepository (integration)", () => {
  const repo = new PrismaSignalRepository();

  afterAll(async () => {
    // Deleting the source cascades its signals.
    await prisma.source.deleteMany({ where: { key: sourceKey } }).catch(() => {});
  });

  it("persists new signals and dedupes on re-ingest (idempotent)", async () => {
    const first = await repo.upsertMany([rec("1", "a"), rec("2", "b")]);
    expect(first).toBe(2);

    // re-ingest overlapping batch → only the new one counts
    const second = await repo.upsertMany([rec("1", "a"), rec("2", "b"), rec("3", "c")]);
    expect(second).toBe(1);

    const source = await prisma.source.findUnique({ where: { key: sourceKey } });
    const count = await prisma.signal.count({ where: { sourceId: source!.id } });
    expect(count).toBe(3);
  });

  it("returns 0 for an empty batch", async () => {
    expect(await repo.upsertMany([])).toBe(0);
  });
});
