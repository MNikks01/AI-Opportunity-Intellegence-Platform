import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ApiKeyAuthProvider, hashApiKey } from "@aioi/auth";
import { prisma } from "./client";
import { bootstrapUser } from "./bootstrap";
import { NotFoundError } from "./watchlists";
import {
  createApiKey,
  findApiKeyByHash,
  listApiKeys,
  revokeApiKey,
  recordApiKeyUsage,
  getApiKeyUsageToday,
  getApiUsageHistory,
} from "./apikeys";

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

  it("records per-day usage and reports today's counts", async () => {
    const created = await createApiKey(orgA, "usage key", []);
    expect(await recordApiKeyUsage(created.id)).toBe(1);
    expect(await recordApiKeyUsage(created.id)).toBe(2);
    expect((await getApiKeyUsageToday([created.id])).get(created.id)).toBe(2);
    expect((await getApiKeyUsageToday(["00000000-0000-0000-0000-000000000000"])).size).toBe(0);
  });

  it("isolates keys across orgs", async () => {
    const created = await createApiKey(orgA, "iso", []);
    await expect(revokeApiKey(orgB, created.id)).rejects.toBeInstanceOf(NotFoundError);
    expect((await listApiKeys(orgB)).some((k) => k.id === created.id)).toBe(false);
  });
});

describe("getApiUsageHistory (fill logic)", () => {
  it("returns exactly `days` zero-filled buckets, oldest→newest, for no keys", async () => {
    const days = 14;
    const series = await getApiUsageHistory([], days);
    expect(series).toHaveLength(days);
    expect(series.every((d) => d.count === 0)).toBe(true);
    // Strictly increasing ISO day strings, ending today (UTC).
    const sorted = [...series].sort((a, b) => a.day.localeCompare(b.day));
    expect(series.map((d) => d.day)).toEqual(sorted.map((d) => d.day));
    expect(series.at(-1)!.day).toBe(new Date().toISOString().slice(0, 10));
  });
});
