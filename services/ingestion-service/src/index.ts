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
export {
  HUGGINGFACE_SOURCE_KEY,
  DEFAULT_HF_SORT,
  fetchModels,
  type HfModel,
} from "./connectors/huggingface";
export {
  PRODUCTHUNT_SOURCE_KEY,
  productHuntConfigured,
  fetchTopPosts,
  type ProductHuntPost,
} from "./connectors/producthunt";
export {
  YOUTUBE_SOURCE_KEY,
  DEFAULT_YOUTUBE_QUERY,
  youtubeConfigured,
  youtubeQuery,
  fetchVideos,
  type YouTubeItem,
} from "./connectors/youtube";
export * from "./repository";
export * from "./repository.prisma";

import { logger } from "@aioi/logger";
import { recordIngestionRun } from "@aioi/database";
import { fetchTopStories } from "./connectors/hackernews";
import { fetchSubreddits, redditConfigured, subredditsFromEnv } from "./connectors/reddit";
import { fetchRepositories } from "./connectors/github";
import { fetchModels } from "./connectors/huggingface";
import { fetchTopPosts, productHuntConfigured } from "./connectors/producthunt";
import { fetchVideos, youtubeConfigured } from "./connectors/youtube";
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
  const startedAt = new Date();
  const { records, skipped } = await fetchTopStories(limit);
  const inserted = await repo.upsertMany(records);
  const result = { fetched: records.length, inserted, skipped };
  logger.info({ source: "hackernews", ...result }, "ingestion pass complete");
  await recordIngestionRun("hackernews", result, startedAt);
  return result;
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
  const startedAt = new Date();
  const { records, skipped } = await fetchSubreddits(subredditsFromEnv(), limitPerSub);
  const inserted = await repo.upsertMany(records);
  const result = { fetched: records.length, inserted, skipped };
  logger.info({ source: "reddit", ...result }, "ingestion pass complete");
  await recordIngestionRun("reddit", result, startedAt);
  return result;
}

/**
 * Run one GitHub ingestion pass (emerging AI repos via the Search API). Works unauthenticated;
 * GITHUB_TOKEN just raises the rate limit. Always safe to schedule.
 */
export async function runGitHubIngestion(
  limit = 30,
  repo: SignalRepository = createSignalRepository(),
): Promise<{ fetched: number; inserted: number; skipped: number }> {
  const startedAt = new Date();
  const { records, skipped } = await fetchRepositories(limit);
  const inserted = await repo.upsertMany(records);
  const result = { fetched: records.length, inserted, skipped };
  logger.info({ source: "github", ...result }, "ingestion pass complete");
  await recordIngestionRun("github", result, startedAt);
  return result;
}

/**
 * Run one Hugging Face ingestion pass (top models by likes). Works unauthenticated; a token raises
 * the rate limit. Always safe to schedule.
 */
export async function runHuggingFaceIngestion(
  limit = 30,
  repo: SignalRepository = createSignalRepository(),
): Promise<{ fetched: number; inserted: number; skipped: number }> {
  const startedAt = new Date();
  const { records, skipped } = await fetchModels(limit);
  const inserted = await repo.upsertMany(records);
  const result = { fetched: records.length, inserted, skipped };
  logger.info({ source: "huggingface", ...result }, "ingestion pass complete");
  await recordIngestionRun("huggingface", result, startedAt);
  return result;
}

/** Run one Product Hunt ingestion pass. No-ops without PRODUCTHUNT_TOKEN. */
export async function runProductHuntIngestion(
  limit = 20,
  repo: SignalRepository = createSignalRepository(),
): Promise<{ fetched: number; inserted: number; skipped: number }> {
  if (!productHuntConfigured()) {
    logger.info({ source: "producthunt" }, "ingestion skipped: producthunt not configured");
    return { fetched: 0, inserted: 0, skipped: 0 };
  }
  const startedAt = new Date();
  const { records, skipped } = await fetchTopPosts(limit);
  const inserted = await repo.upsertMany(records);
  const result = { fetched: records.length, inserted, skipped };
  logger.info({ source: "producthunt", ...result }, "ingestion pass complete");
  await recordIngestionRun("producthunt", result, startedAt);
  return result;
}

/** Run one YouTube ingestion pass. No-ops without YOUTUBE_API_KEY. */
export async function runYouTubeIngestion(
  limit = 25,
  repo: SignalRepository = createSignalRepository(),
): Promise<{ fetched: number; inserted: number; skipped: number }> {
  if (!youtubeConfigured()) {
    logger.info({ source: "youtube" }, "ingestion skipped: youtube not configured");
    return { fetched: 0, inserted: 0, skipped: 0 };
  }
  const startedAt = new Date();
  const { records, skipped } = await fetchVideos(limit);
  const inserted = await repo.upsertMany(records);
  const result = { fetched: records.length, inserted, skipped };
  logger.info({ source: "youtube", ...result }, "ingestion pass complete");
  await recordIngestionRun("youtube", result, startedAt);
  return result;
}
