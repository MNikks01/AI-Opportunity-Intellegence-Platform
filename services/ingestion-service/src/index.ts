/**
 * @aioi/ingestion-service
 * Source workers: fetch, validate, dedupe, emit signal.ingested. Legality-gated.
 */
export * from "./connectors/hackernews";
export * from "./repository";
export * from "./repository.prisma";

import { logger } from "@aioi/logger";
import { fetchTopStories } from "./connectors/hackernews";
import { InMemorySignalRepository, type SignalRepository } from "./repository";
import { PrismaSignalRepository } from "./repository.prisma";

/** Prisma-backed persistence when a database is configured; in-memory otherwise (unit tests). */
export function createSignalRepository(): SignalRepository {
  return process.env.DATABASE_URL ? new PrismaSignalRepository() : new InMemorySignalRepository();
}

/** Run one HN ingestion pass. Defaults to the environment's repository (Prisma when DB-configured). */
export async function runHackerNewsIngestion(
  limit = 30,
  repo: SignalRepository = createSignalRepository(),
): Promise<{ fetched: number; inserted: number; skipped: number }> {
  const { records, skipped } = await fetchTopStories(limit);
  const inserted = await repo.upsertMany(records);
  logger.info(
    { source: "hackernews", fetched: records.length, inserted, skipped },
    "ingestion pass complete",
  );
  return { fetched: records.length, inserted, skipped };
}
