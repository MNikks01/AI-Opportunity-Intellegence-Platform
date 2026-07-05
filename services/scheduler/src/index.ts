/**
 * @aioi/scheduler
 * Cron + BullMQ repeatable jobs: periodic ingestion and daily-brief generation.
 */
export * from "./jobs";
export { startScheduler } from "./queue";

import { logger } from "@aioi/logger";
import { startScheduler } from "./queue";

// Entry point when run as a service (`node dist/index.js`).
if (process.argv[1] && process.argv[1].endsWith("index.js")) {
  startScheduler().catch((err) => {
    logger.error({ err }, "scheduler failed to start");
    process.exit(1);
  });
}
