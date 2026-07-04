import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./client";
import { withOrgContext } from "./rls";

// Integration test — needs a live Postgres with the enable_tenant_rls migration.
// Skipped when DATABASE_URL is unset. RLS only enforces for a NON-superuser role, so we create a
// restricted `rls_app` role and run the checks through it (the default `aioi` user is a superuser
// and would bypass RLS — see ADR-0003).
const hasDb = Boolean(process.env.DATABASE_URL);
const suffix = randomUUID().slice(0, 8);
const createdOrgIds: string[] = [];

const appUrl = (process.env.DATABASE_URL ?? "").replace(/\/\/[^@]+@/, "//rls_app:rls_app@");
let app: PrismaClient;

async function makeOrg(name: string): Promise<string> {
  // Organization has no RLS (root of the tenant graph) — create as the owner.
  const org = await prisma.organization.create({ data: { name, slug: `${name}-${suffix}` } });
  createdOrgIds.push(org.id);
  return org.id;
}

describe.skipIf(!hasDb)("RLS tenant isolation (integration)", () => {
  beforeAll(async () => {
    await prisma.$executeRawUnsafe(
      `DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='rls_app') THEN
         CREATE ROLE rls_app LOGIN PASSWORD 'rls_app' NOSUPERUSER NOBYPASSRLS; END IF; END $$;`,
    );
    await prisma.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO rls_app`);
    await prisma.$executeRawUnsafe(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO rls_app`,
    );
    app = new PrismaClient({ datasources: { db: { url: appUrl } } });
  });

  afterAll(async () => {
    await app?.$disconnect();
    for (const id of createdOrgIds) {
      await prisma.organization.delete({ where: { id } }).catch(() => {});
    }
  });

  it("scopes reads to the org set via withOrgContext (restricted role)", async () => {
    const orgA = await makeOrg("rls-a");
    const orgB = await makeOrg("rls-b");
    await withOrgContext(
      orgA,
      (tx) => tx.workspace.create({ data: { organizationId: orgA, name: "A-ws" } }),
      app,
    );
    await withOrgContext(
      orgB,
      (tx) => tx.workspace.create({ data: { organizationId: orgB, name: "B-ws" } }),
      app,
    );

    const seenByA = await withOrgContext(orgA, (tx) => tx.workspace.findMany(), app);
    expect(seenByA.every((w) => w.organizationId === orgA)).toBe(true);
    expect(seenByA.some((w) => w.name === "A-ws")).toBe(true);
    expect(seenByA.some((w) => w.organizationId === orgB)).toBe(false);
  });

  it("WITH CHECK blocks inserting a row for a different org", async () => {
    const orgA = await makeOrg("rls-c");
    const orgB = await makeOrg("rls-d");
    await expect(
      withOrgContext(
        orgA,
        (tx) => tx.workspace.create({ data: { organizationId: orgB, name: "x" } }),
        app,
      ),
    ).rejects.toThrow();
  });

  it("cross-org context cannot see another org's rows", async () => {
    const orgA = await makeOrg("rls-e");
    const orgB = await makeOrg("rls-f");
    await withOrgContext(
      orgA,
      (tx) => tx.workspace.create({ data: { organizationId: orgA, name: "hidden" } }),
      app,
    );
    const seenByB = await withOrgContext(
      orgB,
      (tx) => tx.workspace.findMany({ where: { name: "hidden" } }),
      app,
    );
    expect(seenByB).toHaveLength(0);
  });

  it("fail-closed: a fresh connection with no org context sees no tenant rows", async () => {
    const orgA = await makeOrg("rls-g");
    await withOrgContext(
      orgA,
      (tx) => tx.workspace.create({ data: { organizationId: orgA, name: "closed" } }),
      app,
    );
    const fresh = new PrismaClient({ datasources: { db: { url: appUrl } } });
    try {
      const rows = await fresh.workspace.findMany({ where: { name: "closed" } }); // no app.current_org
      expect(rows).toHaveLength(0);
    } finally {
      await fresh.$disconnect();
    }
  });
});
