import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "./client";
import { withOrgContext } from "./rls";

// Integration test — proves RLS via the ACTUAL runtime role. Requires a live Postgres AND
// APP_DATABASE_URL pointing at the restricted `aioi_app` role (superusers bypass RLS; ADR-0003).
// Skipped otherwise (e.g. local `pnpm test` with only DATABASE_URL set).
const enabled = Boolean(process.env.DATABASE_URL) && Boolean(process.env.APP_DATABASE_URL);

const suffix = randomUUID().slice(0, 8);
const createdOrgIds: string[] = [];

async function makeOrg(name: string): Promise<string> {
  // Organization has no RLS (root of the tenant graph); aioi_app has INSERT grant.
  const org = await prisma.organization.create({ data: { name, slug: `${name}-${suffix}` } });
  createdOrgIds.push(org.id);
  return org.id;
}

describe.skipIf(!enabled)("RLS tenant isolation via the runtime role (integration)", () => {
  afterAll(async () => {
    for (const id of createdOrgIds) {
      await prisma.organization.delete({ where: { id } }).catch(() => {});
    }
  });

  it("the runtime client connects as a non-superuser, non-BYPASSRLS role", async () => {
    const rows = await prisma.$queryRaw<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>`
      SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`;
    expect(rows[0]?.rolsuper).toBe(false);
    expect(rows[0]?.rolbypassrls).toBe(false);
  });

  it("scopes reads to the org set via withOrgContext", async () => {
    const orgA = await makeOrg("rls-a");
    const orgB = await makeOrg("rls-b");
    await withOrgContext(orgA, (tx) =>
      tx.workspace.create({ data: { organizationId: orgA, name: "A-ws" } }),
    );
    await withOrgContext(orgB, (tx) =>
      tx.workspace.create({ data: { organizationId: orgB, name: "B-ws" } }),
    );

    const seenByA = await withOrgContext(orgA, (tx) => tx.workspace.findMany());
    expect(seenByA.every((w) => w.organizationId === orgA)).toBe(true);
    expect(seenByA.some((w) => w.name === "A-ws")).toBe(true);
    expect(seenByA.some((w) => w.organizationId === orgB)).toBe(false);
  });

  it("WITH CHECK blocks inserting a row for a different org", async () => {
    const orgA = await makeOrg("rls-c");
    const orgB = await makeOrg("rls-d");
    await expect(
      withOrgContext(orgA, (tx) =>
        tx.workspace.create({ data: { organizationId: orgB, name: "x" } }),
      ),
    ).rejects.toThrow();
  });

  it("fail-closed: a fresh connection with no org context sees no tenant rows", async () => {
    const orgA = await makeOrg("rls-e");
    await withOrgContext(orgA, (tx) =>
      tx.workspace.create({ data: { organizationId: orgA, name: "closed" } }),
    );
    const fresh = new PrismaClient({ datasources: { db: { url: process.env.APP_DATABASE_URL } } });
    try {
      const rows = await fresh.workspace.findMany({ where: { name: "closed" } }); // no app.current_org
      expect(rows).toHaveLength(0);
    } finally {
      await fresh.$disconnect();
    }
  });
});
