/**
 * BullMQ wiring: a single queue with repeatable (cron) jobs and a worker that dispatches to the pure
 * job functions. Kept thin so the logic stays testable in `jobs.ts`. Connect via REDIS_URL.
 */
import { Queue, Worker, type ConnectionOptions } from "bullmq";
import { logger } from "@aioi/logger";
import {
  JOB,
  runClusteringJob,
  runScoringJob,
  runSnapshotJob,
  runDailyBriefsJob,
  runIngestionJob,
  runRedditIngestionJob,
  runGitHubIngestionJob,
  runHuggingFaceIngestionJob,
  runProductHuntIngestionJob,
  runYouTubeIngestionJob,
  runArxivIngestionJob,
  runNpmIngestionJob,
  runPypiIngestionJob,
  runHnHiringIngestionJob,
  runSecEdgarIngestionJob,
  runCrunchbaseIngestionJob,
} from "./jobs";

const QUEUE_NAME = "aioi-scheduler";

function connection(): ConnectionOptions {
  return { url: process.env.REDIS_URL ?? "redis://localhost:6379" };
}

/** Register repeatable jobs and start the worker. Returns handles so callers can shut down cleanly. */
export async function startScheduler(): Promise<{ queue: Queue; worker: Worker }> {
  const queue = new Queue(QUEUE_NAME, { connection: connection() });

  // HN every 30 min; Reddit at :15 past each half-hour (no-op without keys); clustering hourly;
  // scoring :15; momentum snapshots :25; briefs 07:00 UTC. Slower sources (npm/hnhiring/funding) daily.
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
  // Hugging Face hourly at :20.
  await queue.add(
    JOB.huggingfaceIngestion,
    {},
    { repeat: { pattern: "20 * * * *" }, jobId: JOB.huggingfaceIngestion },
  );
  // Product Hunt + YouTube hourly (no-op without their keys).
  await queue.add(
    JOB.productHuntIngestion,
    {},
    { repeat: { pattern: "35 * * * *" }, jobId: JOB.productHuntIngestion },
  );
  await queue.add(
    JOB.youtubeIngestion,
    {},
    { repeat: { pattern: "40 * * * *" }, jobId: JOB.youtubeIngestion },
  );
  // Keyless leading-indicator sources (respecting each API's fair-access cadence).
  // arXiv every 6h at :10 (research precedes products); PyPI every 3h at :10 (new-package RSS).
  await queue.add(
    JOB.arxivIngestion,
    {},
    { repeat: { pattern: "10 */6 * * *" }, jobId: JOB.arxivIngestion },
  );
  await queue.add(
    JOB.pypiIngestion,
    {},
    { repeat: { pattern: "10 */3 * * *" }, jobId: JOB.pypiIngestion },
  );
  // Slower-moving demand/adoption sources, once daily (06:xx UTC). Funding + SEC no-op without keys.
  await queue.add(
    JOB.npmIngestion,
    {},
    { repeat: { pattern: "10 6 * * *" }, jobId: JOB.npmIngestion },
  );
  await queue.add(
    JOB.hnHiringIngestion,
    {},
    { repeat: { pattern: "20 6 * * *" }, jobId: JOB.hnHiringIngestion },
  );
  await queue.add(
    JOB.secEdgarIngestion,
    {},
    { repeat: { pattern: "30 6 * * *" }, jobId: JOB.secEdgarIngestion },
  );
  await queue.add(
    JOB.crunchbaseIngestion,
    {},
    { repeat: { pattern: "40 6 * * *" }, jobId: JOB.crunchbaseIngestion },
  );
  await queue.add(JOB.clustering, {}, { repeat: { pattern: "5 * * * *" }, jobId: JOB.clustering });
  // Score freshly-clustered trends 10 min after clustering.
  await queue.add(JOB.scoring, {}, { repeat: { pattern: "15 * * * *" }, jobId: JOB.scoring });
  // Record momentum snapshots at the end of each cycle, after scoring (:25). This is what makes the
  // momentum/trajectory features accrue a baseline — it must run from the start, so it is unconditional.
  await queue.add(JOB.snapshot, {}, { repeat: { pattern: "25 * * * *" }, jobId: JOB.snapshot });
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
      if (job.name === JOB.huggingfaceIngestion) return runHuggingFaceIngestionJob();
      if (job.name === JOB.productHuntIngestion) return runProductHuntIngestionJob();
      if (job.name === JOB.youtubeIngestion) return runYouTubeIngestionJob();
      if (job.name === JOB.arxivIngestion) return runArxivIngestionJob();
      if (job.name === JOB.npmIngestion) return runNpmIngestionJob();
      if (job.name === JOB.pypiIngestion) return runPypiIngestionJob();
      if (job.name === JOB.hnHiringIngestion) return runHnHiringIngestionJob();
      if (job.name === JOB.secEdgarIngestion) return runSecEdgarIngestionJob();
      if (job.name === JOB.crunchbaseIngestion) return runCrunchbaseIngestionJob();
      if (job.name === JOB.clustering) return runClusteringJob();
      if (job.name === JOB.scoring) return runScoringJob();
      if (job.name === JOB.snapshot) return runSnapshotJob();
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
