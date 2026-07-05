import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { bootstrapUser, listBriefs, prisma } from "@aioi/database";
import { runDailyBriefsJob } from "./jobs";

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
  afterAll(async () => {
    for (const id of orgIds) await prisma.organization.delete({ where: { id } }).catch(() => {});
    for (const id of userIds) await prisma.user.delete({ where: { id } }).catch(() => {});
  });

  it("generates one brief per given org", async () => {
    const a = await tenant();
    const b = await tenant();
    const res = await runDailyBriefsJob([a, b]);
    expect(res).toEqual({ orgs: 2, generated: 2 });
    expect((await listBriefs(a)).length).toBeGreaterThan(0);
    expect((await listBriefs(b)).length).toBeGreaterThan(0);
  });
});
