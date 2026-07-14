/**
 * Job logic (B-018/B-024 automation). Pure async functions so they're testable without BullMQ/Redis;
 * the queue layer just schedules them. System fan-out over all active orgs uses `listActiveOrgIds`
 * (Organization has no RLS); each per-org call is RLS-scoped inside the repo.
 */
import {
  generateDailyBrief,
  listActiveOrgIds,
  listOrgMemberEmails,
  recordTrendSnapshots,
  recordEntitySnapshots,
} from "@aioi/database";
import {
  runHackerNewsIngestion,
  runRedditIngestion,
  runGitHubIngestion,
  runHuggingFaceIngestion,
  runProductHuntIngestion,
  runYouTubeIngestion,
  runArxivIngestion,
  runNpmIngestion,
  runPypiIngestion,
  runHnHiringIngestion,
  runSecEdgarIngestion,
  runCrunchbaseIngestion,
  runRssIngestion,
} from "@aioi/ingestion-service";
import { clusterRecentSignals, scoreClusteredTrends } from "@aioi/ai-service";
import { getEmailProvider, renderBriefEmail, type BriefLike } from "@aioi/email";
import { logger } from "@aioi/logger";

export async function runIngestionJob(limit = 30) {
  const result = await runHackerNewsIngestion(limit);
  logger.info(result, "scheduler: ingestion job complete");
  return result;
}

export async function runRedditIngestionJob(limitPerSub = 25) {
  const result = await runRedditIngestion(limitPerSub);
  logger.info(result, "scheduler: reddit ingestion job complete");
  return result;
}

export async function runGitHubIngestionJob(limit = 30) {
  const result = await runGitHubIngestion(limit);
  logger.info(result, "scheduler: github ingestion job complete");
  return result;
}

export async function runHuggingFaceIngestionJob(limit = 30) {
  const result = await runHuggingFaceIngestion(limit);
  logger.info(result, "scheduler: huggingface ingestion job complete");
  return result;
}

export async function runProductHuntIngestionJob(limit = 20) {
  const result = await runProductHuntIngestion(limit);
  logger.info(result, "scheduler: producthunt ingestion job complete");
  return result;
}

export async function runYouTubeIngestionJob(limit = 25) {
  const result = await runYouTubeIngestion(limit);
  logger.info(result, "scheduler: youtube ingestion job complete");
  return result;
}

export async function runArxivIngestionJob(limit = 30) {
  const result = await runArxivIngestion(limit);
  logger.info(result, "scheduler: arxiv ingestion job complete");
  return result;
}

export async function runNpmIngestionJob(limit = 30) {
  const result = await runNpmIngestion(limit);
  logger.info(result, "scheduler: npm ingestion job complete");
  return result;
}

export async function runPypiIngestionJob() {
  const result = await runPypiIngestion();
  logger.info(result, "scheduler: pypi ingestion job complete");
  return result;
}

export async function runHnHiringIngestionJob() {
  const result = await runHnHiringIngestion();
  logger.info(result, "scheduler: hnhiring ingestion job complete");
  return result;
}

export async function runSecEdgarIngestionJob() {
  const result = await runSecEdgarIngestion();
  logger.info(result, "scheduler: sec-edgar ingestion job complete");
  return result;
}

export async function runCrunchbaseIngestionJob() {
  const result = await runCrunchbaseIngestion();
  logger.info(result, "scheduler: crunchbase ingestion job complete");
  return result;
}

export async function runRssIngestionJob() {
  const result = await runRssIngestion();
  logger.info(result, "scheduler: rss ingestion job complete");
  return result;
}

export async function runClusteringJob() {
  const result = await clusterRecentSignals();
  logger.info(result, "scheduler: clustering job complete");
  return result;
}

export async function runScoringJob() {
  const result = await scoreClusteredTrends();
  logger.info(result, "scheduler: scoring job complete");
  return result;
}

/**
 * Record one history point per trend + tracked entity — the raw material for momentum/trajectory.
 * Runs at the end of each pipeline cycle (after scoring); only useful once ≥2 runs accrue, so it must
 * run from the start for the baseline to build. No-ops cleanly on an empty database.
 */
export async function runSnapshotJob(): Promise<{ trends: number; entities: number }> {
  const trends = await recordTrendSnapshots();
  const entities = await recordEntitySnapshots();
  const result = { trends: trends.count, entities: entities.count };
  logger.info(result, "scheduler: snapshot job complete");
  return result;
}

export async function runDailyBriefsJob(
  orgIds?: string[],
): Promise<{ orgs: number; generated: number; emailed: number }> {
  const ids = orgIds ?? (await listActiveOrgIds());
  const email = getEmailProvider();
  let generated = 0;
  let emailed = 0;
  for (const id of ids) {
    try {
      const brief = await generateDailyBrief(id);
      generated += 1;
      const msg = renderBriefEmail(brief.content as unknown as BriefLike);
      for (const to of await listOrgMemberEmails(id)) {
        await email.send({ to, ...msg });
        emailed += 1;
      }
    } catch (err) {
      logger.warn({ err, orgId: id }, "scheduler: daily brief failed for org");
    }
  }
  logger.info({ orgs: ids.length, generated, emailed }, "scheduler: daily briefs job complete");
  return { orgs: ids.length, generated, emailed };
}

export const JOB = {
  ingestion: "ingestion:hackernews",
  redditIngestion: "ingestion:reddit",
  githubIngestion: "ingestion:github",
  huggingfaceIngestion: "ingestion:huggingface",
  productHuntIngestion: "ingestion:producthunt",
  youtubeIngestion: "ingestion:youtube",
  arxivIngestion: "ingestion:arxiv",
  npmIngestion: "ingestion:npm",
  pypiIngestion: "ingestion:pypi",
  hnHiringIngestion: "ingestion:hnhiring",
  secEdgarIngestion: "ingestion:sec-edgar",
  crunchbaseIngestion: "ingestion:crunchbase",
  rssIngestion: "ingestion:rss",
  clustering: "clustering:signals",
  scoring: "scoring:trends",
  snapshot: "snapshot:momentum",
  dailyBriefs: "briefs:daily",
} as const;
