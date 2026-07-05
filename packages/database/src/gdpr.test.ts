import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "./client";
import { bootstrapUser } from "./bootstrap";
import { createWatchlist } from "./watchlists";
import { exportOrgData, deleteOrg } from "./gdpr";

const enabled = Boolean(process.env.DATABASE_URL) && Boolean(process.env.APP_DATABASE_URL);
const orgIds: string[] = [];
const userIds: string[] = [];

async function tenant() {
  const clerkId = `clerk_${randomUUID().slice(0, 12)}`;
  const r = await bootstrapUser({ clerkId, email: `${clerkId}@example.com` });
  orgIds.push(r.organizationId);
  userIds.push(r.userId);
  return { orgId: r.organizationId, workspaceId: r.workspaceId! };
}

describe.skipIf(!enabled)("GDPR export/delete (integration)", () => {
  afterAll(async () => {
    for (const id of orgIds) await prisma.organization.delete({ where: { id } }).catch(() => {});
    for (const id of userIds) await prisma.user.delete({ where: { id } }).catch(() => {});
  });

  it("exports the org's data (scoped, no secrets) and isolates across orgs", async () => {
    const { orgId, workspaceId } = await tenant();
    const { orgId: otherOrg } = await tenant();
    const wl = await createWatchlist(orgId, { workspaceId, name: "gdpr-wl" });

    const dump = await exportOrgData(orgId);
    expect(dump.organization?.id).toBe(orgId);
    expect(dump.workspaces.length).toBeGreaterThan(0);
    expect(dump.watchlists.some((w) => w.id === wl.id)).toBe(true);
    expect(dump.memberships[0]?.user.email).toContain("@example.com");
    // API keys never include the hash
    expect(dump.apiKeys.every((k) => !("hashedKey" in k))).toBe(true);

    // another org's export does not see this org's watchlist
    const otherDump = await exportOrgData(otherOrg);
    expect(otherDump.watchlists.some((w) => w.id === wl.id)).toBe(false);
  });

  it("hard-deletes an org and cascades its data", async () => {
    const { orgId, workspaceId } = await tenant();
    await createWatchlist(orgId, { workspaceId, name: "to-erase" });

    await deleteOrg(orgId);
    expect(await prisma.organization.findUnique({ where: { id: orgId } })).toBeNull();
    expect(await prisma.workspace.count({ where: { organizationId: orgId } })).toBe(0); // cascaded
  });
});
