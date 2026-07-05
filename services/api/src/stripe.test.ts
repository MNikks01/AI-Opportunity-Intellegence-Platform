import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bootstrapUser, getPlan, prisma } from "@aioi/database";
import { handleStripeEvent } from "./stripe";

const enabled = Boolean(process.env.DATABASE_URL) && Boolean(process.env.APP_DATABASE_URL);
const orgIds: string[] = [];
const userIds: string[] = [];
let orgId: string;

describe.skipIf(!enabled)("handleStripeEvent (integration)", () => {
  beforeAll(async () => {
    const clerkId = `clerk_${randomUUID().slice(0, 12)}`;
    const r = await bootstrapUser({ clerkId, email: `${clerkId}@example.com` });
    orgId = r.organizationId;
    orgIds.push(r.organizationId);
    userIds.push(r.userId);
  });
  afterAll(async () => {
    for (const id of orgIds) await prisma.organization.delete({ where: { id } }).catch(() => {});
    for (const id of userIds) await prisma.user.delete({ where: { id } }).catch(() => {});
  });

  it("upgrades the org to PRO on an active subscription, then FREE on delete", async () => {
    await handleStripeEvent({
      type: "customer.subscription.updated",
      data: { object: { status: "active", metadata: { orgId } } },
    });
    expect(await getPlan(orgId)).toBe("PRO");

    await handleStripeEvent({
      type: "customer.subscription.deleted",
      data: { object: { metadata: { orgId } } },
    });
    expect(await getPlan(orgId)).toBe("FREE");
  });

  it("ignores events without an orgId or non-subscription events", async () => {
    await handleStripeEvent({ type: "invoice.paid", data: { object: { metadata: { orgId } } } });
    await handleStripeEvent({ type: "customer.subscription.updated", data: { object: {} } });
    expect(await getPlan(orgId)).toBe("FREE"); // unchanged from the previous test
  });
});
