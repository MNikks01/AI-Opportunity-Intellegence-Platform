import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ApiKeyAuthProvider, hashApiKey } from "@aioi/auth";
import { prisma } from "./client";
import { bootstrapUser } from "./bootstrap";
import { NotFoundError } from "./watchlists";
import { createApiKey, findApiKeyByHash, listApiKeys, revokeApiKey } from "./apikeys";

const enabled = Boolean(process.env.DATABASE_URL) && Boolean(process.env.APP_DATABASE_URL);
const orgIds: string[] = [];
const userIds: string[] = [];
let orgA: string, orgB: string;

async function org() {
  const clerkId = `clerk_${randomUUID().slice(0, 12)}`;
  const r = await bootstrapUser({ clerkId, email: `${clerkId}@example.com` });
  orgIds.push(r.organizationId);
  userIds.push(r.userId);
  return r.organizationId;
}

describe.skipIf(!enabled)("api keys (integration)", () => {
  beforeAll(async () => {
    orgA = await org();
    orgB = await org();
  });
  afterAll(async () => {
    for (const id of orgIds) await prisma.organization.delete({ where: { id } }).catch(() => {});
    for (const id of userIds) await prisma.user.delete({ where: { id } }).catch(() => {});
  });

  it("creates a key, resolves it by hash, lists it without the hash, and revokes it", async () => {
    const created = await createApiKey(orgA, "CI key", ["trends:read"]);
    expect(created.raw.startsWith("aioi_")).toBe(true);

    const rec = await findApiKeyByHash(hashApiKey(created.raw));
    expect(rec).toMatchObject({ organizationId: orgA, scopes: ["trends:read"], revokedAt: null });

    const list = await listApiKeys(orgA);
    expect(list.some((k) => k.id === created.id)).toBe(true);
    expect(list[0]).not.toHaveProperty("hashedKey"); // never exposed

    await revokeApiKey(orgA, created.id);
    expect((await findApiKeyByHash(hashApiKey(created.raw)))?.revokedAt).toBeTruthy();
  });

  it("authenticates via ApiKeyAuthProvider + the DB lookup; a revoked key is denied", async () => {
    const created = await createApiKey(orgA, "auth key", ["trends:read", "watchlists:read"]);
    const provider = new ApiKeyAuthProvider(findApiKeyByHash);
    const ctx = await provider.authenticate({
      headers: { authorization: `Bearer ${created.raw}` },
    });
    expect(ctx).toMatchObject({
      orgId: orgA,
      kind: "apikey",
      scopes: ["trends:read", "watchlists:read"],
    });

    await revokeApiKey(orgA, created.id);
    expect(
      await provider.authenticate({ headers: { authorization: `Bearer ${created.raw}` } }),
    ).toBeNull();
  });

  it("isolates keys across orgs", async () => {
    const created = await createApiKey(orgA, "iso", []);
    await expect(revokeApiKey(orgB, created.id)).rejects.toBeInstanceOf(NotFoundError);
    expect((await listApiKeys(orgB)).some((k) => k.id === created.id)).toBe(false);
  });
});
