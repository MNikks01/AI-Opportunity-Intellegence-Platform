import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@aioi/database";
import { clerkVerifier, handleClerkUserEvent } from "./clerk";

describe("clerkVerifier", () => {
  it("returns null when Clerk is not configured (no CLERK_SECRET_KEY)", async () => {
    const saved = process.env.CLERK_SECRET_KEY;
    delete process.env.CLERK_SECRET_KEY;
    try {
      expect(await clerkVerifier({ headers: { authorization: "Bearer x" } })).toBeNull();
    } finally {
      if (saved !== undefined) process.env.CLERK_SECRET_KEY = saved;
    }
  });
});

const hasDb = Boolean(process.env.DATABASE_URL);
const userIds: string[] = [];
const orgIds: string[] = [];

describe.skipIf(!hasDb)("handleClerkUserEvent (integration)", () => {
  afterAll(async () => {
    for (const id of orgIds) await prisma.organization.delete({ where: { id } }).catch(() => {});
    for (const id of userIds) await prisma.user.delete({ where: { id } }).catch(() => {});
  });

  it("provisions a tenant on user.created (idempotent)", async () => {
    const clerkId = `clerk_${randomUUID().slice(0, 12)}`;
    const evt = {
      type: "user.created",
      data: {
        id: clerkId,
        email_addresses: [{ email_address: `${clerkId}@example.com` }],
        first_name: "Ada",
        last_name: "Lovelace",
      },
    };
    await handleClerkUserEvent(evt);
    await handleClerkUserEvent(evt); // idempotent — no duplicate tenant

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: { memberships: true },
    });
    expect(user?.name).toBe("Ada Lovelace");
    expect(user?.memberships).toHaveLength(1);
    if (user) {
      userIds.push(user.id);
      orgIds.push(user.memberships[0]!.organizationId);
    }
  });

  it("ignores non-user events", async () => {
    const clerkId = `clerk_${randomUUID().slice(0, 12)}`;
    await handleClerkUserEvent({ type: "session.created", data: { id: clerkId } });
    expect(await prisma.user.findUnique({ where: { clerkId } })).toBeNull();
  });
});
