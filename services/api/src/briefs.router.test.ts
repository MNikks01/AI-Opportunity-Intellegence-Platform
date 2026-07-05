import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bootstrapUser, prisma } from "@aioi/database";
import type { AuthContext } from "@aioi/auth";
import { appRouter } from "./router";

const enabled = Boolean(process.env.DATABASE_URL) && Boolean(process.env.APP_DATABASE_URL);
const orgIds: string[] = [];
const userIds: string[] = [];
let orgId: string;
let userId: string;

const owner = (): AuthContext => ({ userId, orgId, role: "OWNER" });

describe.skipIf(!enabled)("briefs tRPC router (integration)", () => {
  beforeAll(async () => {
    const clerkId = `clerk_${randomUUID().slice(0, 12)}`;
    const r = await bootstrapUser({ clerkId, email: `${clerkId}@example.com` });
    orgId = r.organizationId;
    userId = r.userId;
    orgIds.push(r.organizationId);
    userIds.push(r.userId);
  });
  afterAll(async () => {
    for (const id of orgIds) await prisma.organization.delete({ where: { id } }).catch(() => {});
    for (const id of userIds) await prisma.user.delete({ where: { id } }).catch(() => {});
  });

  it("generates, lists, and opens a brief", async () => {
    const caller = appRouter.createCaller({ auth: owner() });
    const brief = await caller.briefs.generate();
    expect(brief.kind).toBe("DAILY");

    const list = await caller.briefs.list();
    expect(list.some((b) => b.id === brief.id)).toBe(true);

    const opened = await caller.briefs.markOpened({ id: brief.id });
    expect(opened.openedAt).toBeTruthy();
  });

  it("rejects unauthenticated access", async () => {
    const anon = appRouter.createCaller({ auth: null });
    await expect(anon.briefs.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
