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

const ctx = (auth: AuthContext) => appRouter.createCaller({ auth });
const owner = (): AuthContext => ({ userId: "u", orgId, role: "OWNER" });

describe.skipIf(!enabled)("watchlists tRPC router (integration)", () => {
  beforeAll(async () => {
    const clerkId = `clerk_${randomUUID().slice(0, 12)}`;
    const r = await bootstrapUser({ clerkId, email: `${clerkId}@example.com` });
    orgId = r.organizationId;
    workspaceId = r.workspaceId!;
    orgIds.push(r.organizationId);
    userIds.push(r.userId);
  });
  afterAll(async () => {
    for (const id of orgIds) await prisma.organization.delete({ where: { id } }).catch(() => {});
    for (const id of userIds) await prisma.user.delete({ where: { id } }).catch(() => {});
  });

  it("creates and lists a watchlist for the caller's org", async () => {
    const caller = ctx(owner());
    const wl = await caller.watchlists.create({ workspaceId, name: "router-wl" });
    expect(wl.organizationId).toBe(orgId);
    const list = await caller.watchlists.list();
    expect(list.some((w) => w.id === wl.id)).toBe(true);
  });

  it("denies a write to a VIEWER (RBAC)", async () => {
    const viewer = ctx({ userId: "u", orgId, role: "VIEWER" });
    await expect(viewer.watchlists.create({ workspaceId, name: "nope" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("returns NOT_FOUND for another org's watchlist", async () => {
    const wl = await ctx(owner()).watchlists.create({ workspaceId, name: "mine" });
    const other = ctx({ userId: "u2", orgId: randomUUID(), role: "OWNER" });
    await expect(other.watchlists.byId({ id: wl.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects unauthenticated access to a protected procedure", async () => {
    const anon = appRouter.createCaller({ auth: null });
    await expect(anon.watchlists.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
