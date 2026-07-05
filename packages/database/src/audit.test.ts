import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./client";
import { bootstrapUser } from "./bootstrap";
import { writeAuditLog, listAuditLogs } from "./audit";

const enabled = Boolean(process.env.DATABASE_URL) && Boolean(process.env.APP_DATABASE_URL);
const orgIds: string[] = [];
const userIds: string[] = [];
let orgA: string, orgB: string;

async function org() {
  const clerkId = `clerk_${randomUUID().slice(0, 12)}`;
  const r = await bootstrapUser({ clerkId, email: `${clerkId}@example.com` });
  orgIds.push(r.organizationId);
  userIds.push(r.userId);
  return r.organizationId;
}

describe.skipIf(!enabled)("audit log (integration)", () => {
  beforeAll(async () => {
    orgA = await org();
    orgB = await org();
  });
  afterAll(async () => {
    for (const id of orgIds) await prisma.organization.delete({ where: { id } }).catch(() => {});
    for (const id of userIds) await prisma.user.delete({ where: { id } }).catch(() => {});
  });

  it("writes and lists entries", async () => {
    await writeAuditLog(orgA, { action: "test.action", metadata: { foo: "bar" } });
    const logs = await listAuditLogs(orgA);
    expect(logs[0]!.action).toBe("test.action");
    expect(logs[0]!.metadata).toEqual({ foo: "bar" });
  });

  it("is isolated per org", async () => {
    await writeAuditLog(orgA, { action: "a.only" });
    expect((await listAuditLogs(orgB)).some((l) => l.action === "a.only")).toBe(false);
  });
});
