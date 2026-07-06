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

const as = (role: AuthContext["role"]): AuthContext => ({ userId, orgId, role });

describe.skipIf(!enabled)("gdpr tRPC router (integration)", () => {
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

  it("export requires admin:access (VIEWER forbidden)", async () => {
    const viewer = appRouter.createCaller({ auth: as("VIEWER") });
    await expect(viewer.gdpr.export()).rejects.toMatchObject({ code: "FORBIDDEN" });
    const owner = appRouter.createCaller({ auth: as("OWNER") });
    expect((await owner.gdpr.export()).organization?.id).toBe(orgId);
  });

  it("deleteOrg requires org:delete (ADMIN forbidden, OWNER allowed)", async () => {
    const admin = appRouter.createCaller({ auth: as("ADMIN") });
    await expect(admin.gdpr.deleteOrg({ confirm: true })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    // create a throwaway org to actually delete as its OWNER
    const clerkId = `clerk_${randomUUID().slice(0, 12)}`;
    const r = await bootstrapUser({ clerkId, email: `${clerkId}@example.com` });
    userIds.push(r.userId);
    const owner = appRouter.createCaller({
      auth: { userId: r.userId, orgId: r.organizationId, role: "OWNER" },
    });
    const res = await owner.gdpr.deleteOrg({ confirm: true });
    expect(res.id).toBe(r.organizationId);
    expect(await prisma.organization.findUnique({ where: { id: r.organizationId } })).toBeNull();
  });
});
