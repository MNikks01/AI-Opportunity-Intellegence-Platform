/**
 * Job logic (B-018/B-024 automation). Pure async functions so they're testable without BullMQ/Redis;
 * the queue layer just schedules them. System fan-out over all active orgs uses `listActiveOrgIds`
 * (Organization has no RLS); each per-org call is RLS-scoped inside the repo.
 */
import { generateDailyBrief, listActiveOrgIds } from "@aioi/database";
import { runHackerNewsIngestion } from "@aioi/ingestion-service";
import { logger } from "@aioi/logger";

export async function runIngestionJob(limit = 30) {
  const result = await runHackerNewsIngestion(limit);
  logger.info(result, "scheduler: ingestion job complete");
  return result;
}

export async function runDailyBriefsJob(
  orgIds?: string[],
): Promise<{ orgs: number; generated: number }> {
  const ids = orgIds ?? (await listActiveOrgIds());
  let generated = 0;
  for (const id of ids) {
    try {
      await generateDailyBrief(id);
      generated += 1;
    } catch (err) {
      logger.warn({ err, orgId: id }, "scheduler: brief generation failed for org");
    }
  }
  logger.info({ orgs: ids.length, generated }, "scheduler: daily briefs job complete");
  return { orgs: ids.length, generated };
}

export const JOB = {
  ingestion: "ingestion:hackernews",
  dailyBriefs: "briefs:daily",
} as const;
