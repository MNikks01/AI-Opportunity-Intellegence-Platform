import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bootstrapUser, listBriefs, prisma } from "@aioi/database";
import { clearOutbox, outbox } from "@aioi/email";
import { runAnalyzeSignalsJob, runDailyBriefsJob, runSnapshotJob } from "./jobs";

// Integration — needs a live Postgres (+ restricted role for RLS). Exercises only the pure job
// function (no BullMQ/Redis).
const enabled = Boolean(process.env.DATABASE_URL) && Boolean(process.env.APP_DATABASE_URL);
const orgIds: string[] = [];
const userIds: string[] = [];

async function tenant(): Promise<string> {
  const clerkId = `clerk_${randomUUID().slice(0, 12)}`;
  const r = await bootstrapUser({ clerkId, email: `${clerkId}@example.com` });
  orgIds.push(r.organizationId);
  userIds.push(r.userId);
  return r.organizationId;
}

describe.skipIf(!enabled)("runDailyBriefsJob (integration)", () => {
  beforeAll(() => clearOutbox());
  afterAll(async () => {
    for (const id of orgIds) await prisma.organization.delete({ where: { id } }).catch(() => {});
    for (const id of userIds) await prisma.user.delete({ where: { id } }).catch(() => {});
  });

  it("generates and emails one brief per given org", async () => {
    const a = await tenant();
    const b = await tenant();
    const res = await runDailyBriefsJob([a, b]);
    expect(res).toEqual({ orgs: 2, generated: 2, emailed: 2 }); // one member per org
    expect((await listBriefs(a)).length).toBeGreaterThan(0);
    expect((await listBriefs(b)).length).toBeGreaterThan(0);
    // brief emails landed in the stub outbox
    expect(outbox.filter((m) => m.subject.startsWith("Your daily brief"))).toHaveLength(2);
  });
});

describe.skipIf(!enabled)("runSnapshotJob (integration)", () => {
  it("records trend + entity snapshots and returns their counts", async () => {
    const res = await runSnapshotJob();
    expect(res).toEqual({
      trends: expect.any(Number),
      entities: expect.any(Number),
    });
    expect(res.trends).toBeGreaterThanOrEqual(0);
    expect(res.entities).toBeGreaterThanOrEqual(0);
  });
});

describe.skipIf(!enabled)("runAnalyzeSignalsJob (integration)", () => {
  it("runs the per-article analysis pass and returns per-outcome counts", async () => {
    const res = await runAnalyzeSignalsJob();
    // Shape check — drives SignalAnalysis population for the News feed/map (M10).
    expect(res).toEqual({
      seen: expect.any(Number),
      analyzed: expect.any(Number),
      cacheHits: expect.any(Number),
      skipped: expect.any(Number),
      deferred: expect.any(Number),
      llmCalls: expect.any(Number),
    });
    // Cost cap honored: never more model calls than the job's budget (40).
    expect(res.llmCalls).toBeLessThanOrEqual(40);
  });
});
