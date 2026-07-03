/**
 * @aioi/ingestion-service
 * Source workers: fetch, validate, dedupe, emit signal.ingested. Legality-gated.
 */
export * from "./connectors/hackernews";
export * from "./repository";

import { logger } from "@aioi/logger";
import { fetchTopStories } from "./connectors/hackernews";
import { InMemorySignalRepository, type SignalRepository } from "./repository";

/** Run one HN ingestion pass. In production the repo is Prisma-backed and this emits an event. */
export async function runHackerNewsIngestion(
  limit = 30,
  repo: SignalRepository = new InMemorySignalRepository(),
): Promise<{ fetched: number; inserted: number; skipped: number }> {
  const { records, skipped } = await fetchTopStories(limit);
  const inserted = await repo.upsertMany(records);
  logger.info(
    { source: "hackernews", fetched: records.length, inserted, skipped },
    "ingestion pass complete",
  );
  return { fetched: records.length, inserted, skipped };
}
