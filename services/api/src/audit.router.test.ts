import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bootstrapUser, prisma } from "@aioi/database";
import type { AuthContext } from "@aioi/auth";
import { appRouter } from "./router";

const enabled = Boolean(process.env.DATABASE_URL) && Boolean(process.env.APP_DATABASE_URL);
const orgIds: string[] = [];
const userIds: string[] = [];
let orgId: string;
let workspaceId: string;
let userId: string;

const owner = (): AuthContext => ({ userId, orgId, role: "OWNER" });

describe.skipIf(!enabled)("audit middleware (integration)", () => {
  beforeAll(async () => {
    const clerkId = `clerk_${randomUUID().slice(0, 12)}`;
    const r = await bootstrapUser({ clerkId, email: `${clerkId}@example.com` });
    orgId = r.organizationId;
    workspaceId = r.workspaceId!;
    userId = r.userId;
    orgIds.push(r.organizationId);
    userIds.push(r.userId);
  });
  afterAll(async () => {
    for (const id of orgIds) await prisma.organization.delete({ where: { id } }).catch(() => {});
    for (const id of userIds) await prisma.user.delete({ where: { id } }).catch(() => {});
  });

  it("records an audit entry for a mutation but not for a query", async () => {
    const caller = appRouter.createCaller({ auth: owner() });

    await caller.watchlists.create({ workspaceId, name: "audited" });
    const afterMutation = await caller.audit.list();
    expect(
      afterMutation.some((a) => a.action === "watchlists.create" && a.actorUserId === userId),
    ).toBe(true);

    const count = afterMutation.length;
    await caller.watchlists.list(); // a query — must not be audited
    const afterQuery = await caller.audit.list();
    expect(afterQuery.length).toBe(count);
  });

  it("audit.list is admin-gated (VIEWER forbidden)", async () => {
    const viewer = appRouter.createCaller({ auth: { userId, orgId, role: "VIEWER" } });
    await expect(viewer.audit.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
