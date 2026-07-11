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
// Selective re-export: arxiv shares names (normalize/IngestResult) with hackernews.
export { ARXIV_SOURCE_KEY, fetchPapers, parseAtom, type ArxivEntry } from "./connectors/arxiv";
// Selective re-export: npm shares names (normalize) with hackernews.
export { NPM_SOURCE_KEY, DEFAULT_NPM_QUERY, fetchPackages, type NpmObject } from "./connectors/npm";
// Selective re-export: pypi shares names (fetchPackages/normalize) with npm — alias to disambiguate.
export {
  PYPI_SOURCE_KEY,
  fetchPackages as fetchPypiPackages,
  parseRss,
  looksAiRelevant,
  type PypiItem,
} from "./connectors/pypi";
// Selective re-export: sec-edgar shares `normalize` with the other connectors.
export {
  SEC_EDGAR_SOURCE_KEY,
  secEdgarConfigured,
  fetchFormDFilings,
  cleanIssuer,
  AI_QUERIES,
} from "./connectors/sec-edgar";
// Selective re-export: crunchbase shares `normalize` with the other connectors.
export {
  CRUNCHBASE_SOURCE_KEY,
  crunchbaseConfigured,
  fetchFundingRounds,
  formatUsd,
  AI_CATEGORIES,
} from "./connectors/crunchbase";
// Selective re-export: hnhiring shares `normalize` with the other connectors.
export {
  HN_HIRING_SOURCE_KEY,
  fetchHiring,
  looksAiHiring,
  type HnHiringComment,
} from "./connectors/hnhiring";
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
import { fetchPapers } from "./connectors/arxiv";
import { fetchPackages } from "./connectors/npm";
import { fetchPackages as fetchPypiPackages } from "./connectors/pypi";
import { fetchHiring } from "./connectors/hnhiring";
import { fetchFormDFilings, secEdgarConfigured } from "./connectors/sec-edgar";
import {
  fetchFundingRounds,
  crunchbaseConfigured,
  CRUNCHBASE_SOURCE_KEY,
} from "./connectors/crunchbase";
import { ensureSource } from "@aioi/database";
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
 * Run one arXiv ingestion pass (latest cs.AI/cs.LG/cs.CL submissions). Keyless, always safe to
 * schedule — a leading indicator (research precedes products).
 */
export async function runArxivIngestion(
  limit = 30,
  repo: SignalRepository = createSignalRepository(),
): Promise<{ fetched: number; inserted: number; skipped: number }> {
  const startedAt = new Date();
  const { records, skipped } = await fetchPapers(limit);
  const inserted = await repo.upsertMany(records);
  const result = { fetched: records.length, inserted, skipped };
  logger.info({ source: "arxiv", ...result }, "ingestion pass complete");
  await recordIngestionRun("arxiv", result, startedAt);
  return result;
}

/**
 * Run one npm ingestion pass (top AI packages by popularity). Keyless, always safe to schedule —
 * package adoption is a leading indicator.
 */
export async function runNpmIngestion(
  limit = 30,
  repo: SignalRepository = createSignalRepository(),
): Promise<{ fetched: number; inserted: number; skipped: number }> {
  const startedAt = new Date();
  const { records, skipped } = await fetchPackages(limit);
  const inserted = await repo.upsertMany(records);
  const result = { fetched: records.length, inserted, skipped };
  logger.info({ source: "npm", ...result }, "ingestion pass complete");
  await recordIngestionRun("npm", result, startedAt);
  return result;
}

/**
 * Run one PyPI ingestion pass (newest AI-relevant packages from the official RSS). Keyless, always
 * safe to schedule — a brand-new AI package on PyPI is a leading indicator.
 */
export async function runPypiIngestion(
  repo: SignalRepository = createSignalRepository(),
): Promise<{ fetched: number; inserted: number; skipped: number }> {
  const startedAt = new Date();
  const { records, skipped } = await fetchPypiPackages();
  const inserted = await repo.upsertMany(records);
  const result = { fetched: records.length, inserted, skipped };
  logger.info({ source: "pypi", ...result }, "ingestion pass complete");
  await recordIngestionRun("pypi", result, startedAt);
  return result;
}

/**
 * Run one SEC EDGAR Form D ingestion pass (recent AI-relevant US private funding rounds). Needs a
 * contact `SEC_USER_AGENT` (SEC fair-access); no-ops without it, so CI/dev stay green with no config.
 * Funding is a leading DEMAND signal (ADR-0006). US-only in v1.
 */
export async function runSecEdgarIngestion(
  repo: SignalRepository = createSignalRepository(),
): Promise<{ fetched: number; inserted: number; skipped: number }> {
  if (!secEdgarConfigured()) {
    logger.info({ source: "sec-edgar" }, "ingestion skipped: SEC_USER_AGENT not set");
    return { fetched: 0, inserted: 0, skipped: 0 };
  }
  const startedAt = new Date();
  const { records, skipped } = await fetchFormDFilings({ userAgent: process.env.SEC_USER_AGENT });
  const inserted = await repo.upsertMany(records);
  const result = { fetched: records.length, inserted, skipped };
  logger.info({ source: "sec-edgar", ...result }, "ingestion pass complete");
  await recordIngestionRun("sec-edgar", result, startedAt);
  return result;
}

/**
 * Run one Crunchbase funding ingestion pass (recent global AI funding rounds). **LICENSED** — inert
 * without `CRUNCHBASE_API_KEY`, so it costs nothing and CI/dev stay green until a license is provisioned;
 * it then activates automatically (ADR-0008). Registers the source as LICENSED before ingesting.
 */
export async function runCrunchbaseIngestion(
  repo: SignalRepository = createSignalRepository(),
): Promise<{ fetched: number; inserted: number; skipped: number }> {
  if (!crunchbaseConfigured()) {
    logger.info({ source: "crunchbase" }, "ingestion skipped: CRUNCHBASE_API_KEY not set");
    return { fetched: 0, inserted: 0, skipped: 0 };
  }
  const startedAt = new Date();
  if (process.env.DATABASE_URL) await ensureSource(CRUNCHBASE_SOURCE_KEY, "LICENSED");
  const { records, skipped } = await fetchFundingRounds();
  const inserted = await repo.upsertMany(records);
  const result = { fetched: records.length, inserted, skipped };
  logger.info({ source: "crunchbase", ...result }, "ingestion pass complete");
  await recordIngestionRun("crunchbase", result, startedAt);
  return result;
}

/**
 * Run one HN "Who is hiring?" ingestion pass (latest thread's AI/ML job posts). Keyless, always safe
 * to schedule — hiring is a leading indicator of demand for a capability.
 */
export async function runHnHiringIngestion(
  repo: SignalRepository = createSignalRepository(),
): Promise<{ fetched: number; inserted: number; skipped: number }> {
  const startedAt = new Date();
  const { records, skipped } = await fetchHiring();
  const inserted = await repo.upsertMany(records);
  const result = { fetched: records.length, inserted, skipped };
  logger.info({ source: "hnhiring", ...result }, "ingestion pass complete");
  await recordIngestionRun("hnhiring", result, startedAt);
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
