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

describe.skipIf(!enabled)("apikeys tRPC router (integration)", () => {
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

  it("creates (raw once), lists, and revokes a key", async () => {
    const owner = appRouter.createCaller({ auth: as("OWNER") });
    const created = await owner.apikeys.create({ name: "prod", scopes: ["trends:read"] });
    expect(created.raw.startsWith("aioi_")).toBe(true);

    const list = await owner.apikeys.list();
    expect(list.some((k) => k.id === created.id)).toBe(true);

    const revoked = await owner.apikeys.revoke({ id: created.id });
    expect(revoked.revokedAt).toBeTruthy();
  });

  it("requires apikeys:manage (VIEWER forbidden)", async () => {
    const viewer = appRouter.createCaller({ auth: as("VIEWER") });
    await expect(viewer.apikeys.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
