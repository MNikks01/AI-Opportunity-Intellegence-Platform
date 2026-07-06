/**
 * BullMQ wiring: a single queue with repeatable (cron) jobs and a worker that dispatches to the pure
 * job functions. Kept thin so the logic stays testable in `jobs.ts`. Connect via REDIS_URL.
 */
import { Queue, Worker, type ConnectionOptions } from "bullmq";
import { logger } from "@aioi/logger";
import {
  JOB,
  runClusteringJob,
  runDailyBriefsJob,
  runIngestionJob,
  runRedditIngestionJob,
  runGitHubIngestionJob,
} from "./jobs";

const QUEUE_NAME = "aioi-scheduler";

function connection(): ConnectionOptions {
  return { url: process.env.REDIS_URL ?? "redis://localhost:6379" };
}

/** Register repeatable jobs and start the worker. Returns handles so callers can shut down cleanly. */
export async function startScheduler(): Promise<{ queue: Queue; worker: Worker }> {
  const queue = new Queue(QUEUE_NAME, { connection: connection() });

  // HN every 30 min; Reddit at :15 past each half-hour (no-op without keys); clustering hourly; briefs 07:00 UTC.
  await queue.add(JOB.ingestion, {}, { repeat: { pattern: "*/30 * * * *" }, jobId: JOB.ingestion });
  await queue.add(
    JOB.redditIngestion,
    {},
    { repeat: { pattern: "15,45 * * * *" }, jobId: JOB.redditIngestion },
  );
  // GitHub hourly at :50 (Search API is rate-limited; a token raises the ceiling).
  await queue.add(
    JOB.githubIngestion,
    {},
    { repeat: { pattern: "50 * * * *" }, jobId: JOB.githubIngestion },
  );
  await queue.add(JOB.clustering, {}, { repeat: { pattern: "5 * * * *" }, jobId: JOB.clustering });
  await queue.add(
    JOB.dailyBriefs,
    {},
    { repeat: { pattern: "0 7 * * *" }, jobId: JOB.dailyBriefs },
  );

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name === JOB.ingestion) return runIngestionJob();
      if (job.name === JOB.redditIngestion) return runRedditIngestionJob();
      if (job.name === JOB.githubIngestion) return runGitHubIngestionJob();
      if (job.name === JOB.clustering) return runClusteringJob();
      if (job.name === JOB.dailyBriefs) return runDailyBriefsJob();
      logger.warn({ name: job.name }, "scheduler: unknown job");
      return null;
    },
    { connection: connection() },
  );

  worker.on("failed", (job, err) => logger.error({ err, job: job?.name }, "scheduler: job failed"));
  logger.info("scheduler started");
  return { queue, worker };
}
