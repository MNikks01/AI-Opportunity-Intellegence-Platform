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
// Selective re-export: rss shares `normalize`/`looksAiRelevant`/`decode` with other connectors.
export {
  RSS_SOURCE_PREFIX,
  RSS_FEEDS,
  rssSourceKey,
  parseFeed,
  fetchFeed,
  looksAiRelevant as rssLooksAiRelevant,
  type RssFeed,
  type RssItem,
  type RssCategory,
} from "./connectors/rss";
// Selective re-export: semantic-scholar shares `normalize` with the other connectors.
export {
  SEMANTIC_SCHOLAR_SOURCE_KEY,
  fetchPapers as fetchSemanticScholarPapers,
  type S2Paper,
} from "./connectors/semantic-scholar";
// Selective re-export: remoteok shares `normalize` with the other connectors.
export {
  REMOTEOK_SOURCE_KEY,
  fetchJobs,
  looksAiJob,
  type RemoteOkJob,
} from "./connectors/remoteok";
// Selective re-export: stackexchange shares `normalize` with the other connectors.
export {
  STACKEXCHANGE_SOURCE_KEY,
  AI_TAGS,
  fetchQuestions,
  type StackQuestion,
} from "./connectors/stackexchange";
export * from "./repository";
export * from "./repository.prisma";

import { logger } from "@aioi/logger";
import {
  recordIngestionRun,
  recordFailedIngestionRun,
  listModelsForEnrichment,
  upsertModelCard,
} from "@aioi/database";
import { fetchModelDetail } from "./connectors/huggingface";
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
import { RSS_FEEDS, fetchFeed, rssSourceKey } from "./connectors/rss";
import { fetchPapers as fetchSemanticScholarPapers } from "./connectors/semantic-scholar";
import { fetchJobs } from "./connectors/remoteok";
import { fetchQuestions } from "./connectors/stackexchange";
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
 * Run one pass over the whole RSS/Atom feed registry (see connectors/rss.ts). Each feed is fetched,
 * parsed, filtered, and persisted independently, and gets its own IngestionRun (`rss:<id>`) so the
 * /sources health view shows per-publisher status. One dead/slow feed never fails the batch — its error
 * is recorded and the loop continues. Keyless; always safe to schedule.
 */
export async function runRssIngestion(
  repo: SignalRepository = createSignalRepository(),
): Promise<{ fetched: number; inserted: number; skipped: number; feeds: number }> {
  let fetched = 0;
  let inserted = 0;
  let skipped = 0;
  let ok = 0;
  for (const feed of RSS_FEEDS) {
    const startedAt = new Date();
    try {
      const { records, skipped: sk } = await fetchFeed(feed);
      const ins = await repo.upsertMany(records);
      const perFeed = { fetched: records.length + sk, inserted: ins, skipped: sk };
      fetched += perFeed.fetched;
      inserted += ins;
      skipped += sk;
      ok += 1;
      await recordIngestionRun(rssSourceKey(feed.id), perFeed, startedAt);
    } catch (err) {
      logger.warn({ err, feed: feed.id }, "rss feed ingestion failed");
      await recordFailedIngestionRun(rssSourceKey(feed.id), err, startedAt);
    }
  }
  const result = { fetched, inserted, skipped, feeds: ok };
  logger.info({ source: "rss", ...result }, "rss ingestion pass complete");
  return result;
}

/**
 * Run one Semantic Scholar pass (newest AI papers). Keyless access shares a low rate pool, so a 429 is
 * expected without SEMANTIC_SCHOLAR_API_KEY — we degrade to a no-op (record a failed run, return zeros)
 * instead of throwing, and activate fully once a key is set. Cross-venue complement to arXiv.
 */
export async function runSemanticScholarIngestion(
  limit = 100,
  repo: SignalRepository = createSignalRepository(),
): Promise<{ fetched: number; inserted: number; skipped: number }> {
  const startedAt = new Date();
  try {
    const { records, skipped } = await fetchSemanticScholarPapers(limit);
    const inserted = await repo.upsertMany(records);
    const result = { fetched: records.length, inserted, skipped };
    logger.info({ source: "semantic-scholar", ...result }, "ingestion pass complete");
    await recordIngestionRun("semantic-scholar", result, startedAt);
    return result;
  } catch (err) {
    logger.warn(
      { err, source: "semantic-scholar" },
      "semantic scholar ingestion failed (rate limit?)",
    );
    await recordFailedIngestionRun("semantic-scholar", err, startedAt);
    return { fetched: 0, inserted: 0, skipped: 0 };
  }
}

/**
 * Run one Remote OK pass (current remote AI job postings). Hiring is a leading demand signal. Keyless;
 * a descriptive User-Agent is required. Best-effort — a fetch failure degrades to a no-op.
 */
export async function runRemoteOkIngestion(
  repo: SignalRepository = createSignalRepository(),
): Promise<{ fetched: number; inserted: number; skipped: number }> {
  const startedAt = new Date();
  try {
    const { records, skipped } = await fetchJobs();
    const inserted = await repo.upsertMany(records);
    const result = { fetched: records.length, inserted, skipped };
    logger.info({ source: "remoteok", ...result }, "ingestion pass complete");
    await recordIngestionRun("remoteok", result, startedAt);
    return result;
  } catch (err) {
    logger.warn({ err, source: "remoteok" }, "remoteok ingestion failed");
    await recordFailedIngestionRun("remoteok", err, startedAt);
    return { fetched: 0, inserted: 0, skipped: 0 };
  }
}

/**
 * Run one Stack Exchange pass (newest questions across AI tags). A burst of questions on a tag is a
 * leading demand/pain signal. Keyless allows 300 req/day/IP; STACKEXCHANGE_KEY raises it. Best-effort.
 */
export async function runStackExchangeIngestion(
  repo: SignalRepository = createSignalRepository(),
): Promise<{ fetched: number; inserted: number; skipped: number }> {
  const startedAt = new Date();
  try {
    const { records, skipped } = await fetchQuestions();
    const inserted = await repo.upsertMany(records);
    const result = { fetched: records.length, inserted, skipped };
    logger.info({ source: "stackexchange", ...result }, "ingestion pass complete");
    await recordIngestionRun("stackexchange", result, startedAt);
    return result;
  } catch (err) {
    logger.warn({ err, source: "stackexchange" }, "stackexchange ingestion failed (quota?)");
    await recordFailedIngestionRun("stackexchange", err, startedAt);
    return { fetched: 0, inserted: 0, skipped: 0 };
  }
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

/**
 * Enrich tracked MODEL entities with their Hugging Face card detail (M9): license, params, and
 * GGUF/Ollama/vLLM/MLX availability. The entity name is the HF repo id; models not on HF (e.g. GPT-5)
 * simply return null and are skipped. Idempotent — safe to schedule; best-effort per model.
 */
export async function enrichModelCards(
  limit = 50,
): Promise<{ seen: number; enriched: number; skipped: number }> {
  const models = await listModelsForEnrichment(limit);
  let enriched = 0;
  let skipped = 0;
  for (const m of models) {
    try {
      const card = await fetchModelDetail(m.name);
      if (!card) {
        skipped += 1;
        continue;
      }
      await upsertModelCard(m.entityId, card);
      enriched += 1;
    } catch (err) {
      logger.warn({ err, model: m.name }, "model-card enrichment failed (skipped)");
      skipped += 1;
    }
  }
  const result = { seen: models.length, enriched, skipped };
  logger.info({ source: "model-cards", ...result }, "model-card enrichment complete");
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
