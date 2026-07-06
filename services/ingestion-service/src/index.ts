/**
 * @aioi/ingestion-service
 * Source workers: fetch, validate, dedupe, emit signal.ingested. Legality-gated.
 */
export * from "./connectors/hackernews";
// Selective re-export: reddit shares names (FetchDeps/IngestResult/normalize) with hackernews.
export {
  REDDIT_SOURCE_KEY,
  DEFAULT_SUBREDDITS,
  redditConfigured,
  subredditsFromEnv,
  getAppToken,
  fetchSubreddit,
  fetchSubreddits,
  type RedditPost,
} from "./connectors/reddit";
// Selective re-export: github shares names (FetchDeps/IngestResult/normalize) with hackernews.
export {
  GITHUB_SOURCE_KEY,
  DEFAULT_GITHUB_QUERY,
  fetchRepositories,
  type GitHubRepo,
} from "./connectors/github";
export * from "./repository";
export * from "./repository.prisma";

import { logger } from "@aioi/logger";
import { fetchTopStories } from "./connectors/hackernews";
import { fetchSubreddits, redditConfigured, subredditsFromEnv } from "./connectors/reddit";
import { fetchRepositories } from "./connectors/github";
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

/**
 * Run one Reddit ingestion pass over the configured subreddits (app-only OAuth). No-ops when
 * REDDIT_CLIENT_ID/SECRET are unset, so it's safe to schedule unconditionally.
 */
export async function runRedditIngestion(
  limitPerSub = 25,
  repo: SignalRepository = createSignalRepository(),
): Promise<{ fetched: number; inserted: number; skipped: number }> {
  if (!redditConfigured()) {
    logger.info({ source: "reddit" }, "ingestion skipped: reddit not configured");
    return { fetched: 0, inserted: 0, skipped: 0 };
  }
  const { records, skipped } = await fetchSubreddits(subredditsFromEnv(), limitPerSub);
  const inserted = await repo.upsertMany(records);
  logger.info(
    { source: "reddit", fetched: records.length, inserted, skipped },
    "ingestion pass complete",
  );
  return { fetched: records.length, inserted, skipped };
}

/**
 * Run one GitHub ingestion pass (emerging AI repos via the Search API). Works unauthenticated;
 * GITHUB_TOKEN just raises the rate limit. Always safe to schedule.
 */
export async function runGitHubIngestion(
  limit = 30,
  repo: SignalRepository = createSignalRepository(),
): Promise<{ fetched: number; inserted: number; skipped: number }> {
  const { records, skipped } = await fetchRepositories(limit);
  const inserted = await repo.upsertMany(records);
  logger.info(
    { source: "github", fetched: records.length, inserted, skipped },
    "ingestion pass complete",
  );
  return { fetched: records.length, inserted, skipped };
}
