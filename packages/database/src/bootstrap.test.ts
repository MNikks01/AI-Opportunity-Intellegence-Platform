import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "./client";
import { withOrgContext } from "./rls";
import { bootstrapUser } from "./bootstrap";

// Integration test — needs a live Postgres. Runs as the restricted runtime role in CI (APP_DATABASE_URL).
const hasDb = Boolean(process.env.DATABASE_URL);
const orgIds: string[] = [];
const userIds: string[] = [];

function newClerkId(): string {
  return `clerk_${randomUUID().slice(0, 12)}`;
}

describe.skipIf(!hasDb)("bootstrapUser (integration)", () => {
  afterAll(async () => {
    for (const id of orgIds) await prisma.organization.delete({ where: { id } }).catch(() => {});
    for (const id of userIds) await prisma.user.delete({ where: { id } }).catch(() => {});
  });

  it("provisions org + OWNER membership + personal workspace on first sign-in", async () => {
    const clerkId = newClerkId();
    const r = await bootstrapUser({ clerkId, email: `${clerkId}@example.com`, name: "Ann" });
    orgIds.push(r.organizationId);
    userIds.push(r.userId);

    expect(r.created).toBe(true);
    expect(r.role).toBe("OWNER");
    expect(r.workspaceId).toBeTruthy();

    const membership = await prisma.membership.findFirst({
      where: { userId: r.userId, organizationId: r.organizationId },
    });
    expect(membership?.role).toBe("OWNER");

    const workspaces = await withOrgContext(r.organizationId, (tx) => tx.workspace.findMany());
    expect(workspaces.some((w) => w.id === r.workspaceId && w.kind === "PERSONAL")).toBe(true);
  });

  it("is idempotent — subsequent sign-ins reuse the same tenant", async () => {
    const clerkId = newClerkId();
    const first = await bootstrapUser({ clerkId, email: `${clerkId}@example.com` });
    orgIds.push(first.organizationId);
    userIds.push(first.userId);

    const second = await bootstrapUser({ clerkId, email: `${clerkId}@example.com` });
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.userId).toBe(first.userId);
    expect(second.organizationId).toBe(first.organizationId);
    expect(second.workspaceId).toBe(first.workspaceId);
  });
});
