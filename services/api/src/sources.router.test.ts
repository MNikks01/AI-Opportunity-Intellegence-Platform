import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bootstrapUser, ensureSource, prisma } from "@aioi/database";
import type { AuthContext } from "@aioi/auth";
import { appRouter } from "./router";

const enabled = Boolean(process.env.DATABASE_URL) && Boolean(process.env.APP_DATABASE_URL);
let orgId: string;
let userId: string;
const key = `srcrouter-${randomUUID().slice(0, 8)}`;

const as = (role: AuthContext["role"]): AuthContext => ({ userId, orgId, role });

describe.skipIf(!enabled)("sources tRPC router (integration)", () => {
  beforeAll(async () => {
    const r = await bootstrapUser({
      clerkId: `clerk_${randomUUID().slice(0, 12)}`,
      email: `${randomUUID().slice(0, 8)}@example.com`,
    });
    orgId = r.organizationId;
    userId = r.userId;
    await ensureSource(key);
  });
  afterAll(async () => {
    await prisma.source.deleteMany({ where: { key } }).catch(() => {});
    await prisma.organization.delete({ where: { id: orgId } }).catch(() => {});
    await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  });

  it("stats requires admin:access (VIEWER forbidden, ADMIN allowed)", async () => {
    const viewer = appRouter.createCaller({ auth: as("VIEWER") });
    await expect(viewer.sources.stats()).rejects.toMatchObject({ code: "FORBIDDEN" });

    const admin = appRouter.createCaller({ auth: as("ADMIN") });
    const stats = await admin.sources.stats();
    expect(stats.some((s) => s.source === key)).toBe(true);
  });
});
