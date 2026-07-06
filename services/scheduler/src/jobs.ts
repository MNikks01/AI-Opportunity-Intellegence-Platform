/**
 * Job logic (B-018/B-024 automation). Pure async functions so they're testable without BullMQ/Redis;
 * the queue layer just schedules them. System fan-out over all active orgs uses `listActiveOrgIds`
 * (Organization has no RLS); each per-org call is RLS-scoped inside the repo.
 */
import { generateDailyBrief, listActiveOrgIds, listOrgMemberEmails } from "@aioi/database";
import {
  runHackerNewsIngestion,
  runRedditIngestion,
  runGitHubIngestion,
} from "@aioi/ingestion-service";
import { clusterRecentSignals } from "@aioi/ai-service";
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

export async function runClusteringJob() {
  const result = await clusterRecentSignals();
  logger.info(result, "scheduler: clustering job complete");
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
  clustering: "clustering:signals",
  dailyBriefs: "briefs:daily",
} as const;
