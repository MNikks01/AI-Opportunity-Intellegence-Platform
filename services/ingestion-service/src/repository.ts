/**
 * SignalRepository — the persistence seam for ingestion. Connectors produce SourceRecords; the
 * repository upserts them idempotently (dedupe by source + externalId). The Prisma-backed impl lives
 * in `repository.prisma.ts` (imports @aioi/database); this in-memory impl keeps unit tests hermetic.
 */
import type { SourceRecord } from "@aioi/shared";

export interface SignalRepository {
  /** Idempotent upsert; returns the number of NEW records inserted (existing ids are no-ops). */
  upsertMany(records: SourceRecord[]): Promise<number>;
}

export class InMemorySignalRepository implements SignalRepository {
  private readonly seen = new Set<string>();
  readonly records: SourceRecord[] = [];

  upsertMany(records: SourceRecord[]): Promise<number> {
    let inserted = 0;
    for (const r of records) {
      const key = `${r.source}:${r.externalId}`;
      if (this.seen.has(key)) continue;
      this.seen.add(key);
      this.records.push(r);
      inserted += 1;
    }
    return Promise.resolve(inserted);
  }
}
