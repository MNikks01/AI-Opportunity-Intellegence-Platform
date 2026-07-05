/**
 * Prisma-backed SignalRepository (B-024). Persists connector output to the global `Signal` table,
 * deduping by the `(sourceId, externalId)` unique constraint via `createMany({ skipDuplicates })` —
 * so it's idempotent and returns the count of genuinely new signals. The Source row (with its legality
 * tier) is ensured first. Signal is a global table, so no org context is needed.
 */
import type { SourceRecord } from "@aioi/shared";
import { prisma, ensureSource } from "@aioi/database";
import type { Prisma } from "@aioi/database";
import type { SignalRepository } from "./repository";

export class PrismaSignalRepository implements SignalRepository {
  async upsertMany(records: SourceRecord[]): Promise<number> {
    if (records.length === 0) return 0;

    const bySource = new Map<string, SourceRecord[]>();
    for (const r of records) {
      const list = bySource.get(r.source) ?? [];
      list.push(r);
      bySource.set(r.source, list);
    }

    let inserted = 0;
    for (const [sourceKey, recs] of bySource) {
      const sourceId = await ensureSource(sourceKey);
      const res = await prisma.signal.createMany({
        data: recs.map((r) => ({
          sourceId,
          externalId: r.externalId,
          url: r.url,
          title: r.title,
          raw: (r.raw ?? {}) as Prisma.InputJsonValue,
          publishedAt: r.publishedAt ? new Date(r.publishedAt) : null,
        })),
        skipDuplicates: true,
      });
      inserted += res.count;
    }
    return inserted;
  }
}
