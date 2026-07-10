/**
 * Ingestion run tracking (connector observability). Each connector pass records an IngestionRun row;
 * the /sources health view surfaces the latest run per source. Best-effort: recording never breaks an
 * ingestion pass. Global tables (no RLS), written by the runtime role via default privileges.
 */
import { logger } from "@aioi/logger";
import { prisma } from "./client";
import { ensureSource } from "./repositories";

export interface RunResult {
  fetched: number;
  inserted: number;
  skipped: number;
}

/** Record a completed ingestion pass. `itemCount` is the number of NEW signals inserted. */
export async function recordIngestionRun(
  sourceKey: string,
  result: RunResult,
  startedAt: Date = new Date(),
): Promise<void> {
  try {
    const sourceId = await ensureSource(sourceKey);
    await prisma.ingestionRun.create({
      data: {
        sourceId,
        status: "SUCCEEDED",
        itemCount: result.inserted,
        startedAt,
        finishedAt: new Date(),
      },
    });
  } catch (err) {
    logger.warn({ err, source: sourceKey }, "failed to record ingestion run");
  }
}

/**
 * Record a FAILED ingestion pass with its error, so the /sources view can show why a (configured)
 * source produced nothing — e.g. an expired token or a quota error. Best-effort.
 */
export async function recordFailedIngestionRun(
  sourceKey: string,
  error: unknown,
  startedAt: Date = new Date(),
): Promise<void> {
  try {
    const sourceId = await ensureSource(sourceKey);
    const message = (error instanceof Error ? error.message : String(error)).slice(0, 300);
    await prisma.ingestionRun.create({
      data: {
        sourceId,
        status: "FAILED",
        itemCount: 0,
        error: message,
        startedAt,
        finishedAt: new Date(),
      },
    });
  } catch (err) {
    logger.warn({ err, source: sourceKey }, "failed to record failed ingestion run");
  }
}

export interface LatestRun {
  status: string;
  itemCount: number;
  error: string | null;
  finishedAt: Date | null;
}

/** Latest run per source, keyed by source key. */
export async function getLatestRuns(): Promise<Map<string, LatestRun>> {
  const runs = await prisma.ingestionRun.findMany({
    orderBy: { startedAt: "desc" },
    distinct: ["sourceId"],
    select: {
      status: true,
      itemCount: true,
      error: true,
      finishedAt: true,
      source: { select: { key: true } },
    },
  });
  return new Map(
    runs.map((r) => [
      r.source.key,
      { status: r.status, itemCount: r.itemCount, error: r.error, finishedAt: r.finishedAt },
    ]),
  );
}
