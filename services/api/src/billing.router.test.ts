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

describe.skipIf(!enabled)("billing tRPC router (integration)", () => {
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

  it("reports the plan + entitlements and upgrades via setPlan", async () => {
    const owner = appRouter.createCaller({ auth: as("OWNER") });
    const before = await owner.billing.plan();
    expect(before.plan).toBe("FREE");
    expect(before.entitlements.semanticSearch).toBe(false);

    await owner.billing.setPlan({ plan: "PRO" });
    const after = await owner.billing.plan();
    expect(after.plan).toBe("PRO");
    expect(after.entitlements.semanticSearch).toBe(true);
  });

  it("setPlan requires billing:manage (VIEWER forbidden)", async () => {
    const viewer = appRouter.createCaller({ auth: as("VIEWER") });
    await expect(viewer.billing.setPlan({ plan: "FREE" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("checkout returns a URL (Stub without Stripe keys)", async () => {
    const owner = appRouter.createCaller({ auth: as("OWNER") });
    const res = await owner.billing.checkout({
      successUrl: "https://app.test/billing",
      cancelUrl: "https://app.test/billing",
    });
    expect(res.url).toContain("stub_checkout");
  });
});
