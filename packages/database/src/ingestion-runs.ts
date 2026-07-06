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

export interface LatestRun {
  status: string;
  itemCount: number;
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
      finishedAt: true,
      source: { select: { key: true } },
    },
  });
  return new Map(
    runs.map((r) => [
      r.source.key,
      { status: r.status, itemCount: r.itemCount, finishedAt: r.finishedAt },
    ]),
  );
}
