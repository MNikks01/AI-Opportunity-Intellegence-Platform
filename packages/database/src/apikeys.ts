/**
 * API-key management + auth lookup (B-014 cont.). Only the SHA-256 hash is stored; the raw key is shown
 * once at creation. Management ops are org-scoped (RLS); the auth-time lookup uses a SECURITY DEFINER
 * function because the org isn't known until the key resolves (ADR-0002 D6 / ADR-0003).
 */
import { generateApiKey, type ApiKeyRecord, type Permission } from "@aioi/auth";
import { prisma } from "./client";
import { withOrgContext } from "./rls";
import { NotFoundError } from "./watchlists";

/** Privileged, RLS-bypassing lookup by hash (auth time). Returns null when unknown. */
export async function findApiKeyByHash(hash: string): Promise<ApiKeyRecord | null> {
  const rows = await prisma.$queryRaw<
    Array<{ id: string; organization_id: string; scopes: string[]; revoked_at: Date | null }>
  >`SELECT * FROM app_find_api_key(${hash})`;
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    organizationId: r.organization_id,
    scopes: r.scopes as Permission[],
    revokedAt: r.revoked_at,
  };
}

/** Mint a key for the org. Returns the raw secret ONCE (never retrievable again) + the stored record. */
export function createApiKey(orgId: string, name: string, scopes: string[]) {
  const { raw, hash, display } = generateApiKey();
  return withOrgContext(orgId, async (tx) => {
    const key = await tx.apiKey.create({
      data: { organizationId: orgId, name, hashedKey: hash, scopes },
      select: { id: true, name: true, scopes: true, createdAt: true },
    });
    return { ...key, raw, display };
  });
}

export function listApiKeys(orgId: string) {
  return withOrgContext(orgId, (tx) =>
    tx.apiKey.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        scopes: true,
        lastUsedAt: true,
        revokedAt: true,
        createdAt: true,
      }, // never expose hashedKey
    }),
  );
}

export function revokeApiKey(orgId: string, id: string) {
  return withOrgContext(orgId, async (tx) => {
    const key = await tx.apiKey.findFirst({ where: { id } });
    if (!key) throw new NotFoundError("api key");
    return tx.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
      select: { id: true, revokedAt: true },
    });
  });
}

/** Record that a key was just used (auth time). Best-effort; the org is known from the lookup. */
export function touchApiKey(orgId: string, id: string) {
  return withOrgContext(orgId, (tx) =>
    tx.apiKey.update({ where: { id }, data: { lastUsedAt: new Date() } }),
  );
}

/** UTC day bucket (YYYY-MM-DD) for the daily quota window. */
export const utcDay = (d = new Date()): string => d.toISOString().slice(0, 10);

/**
 * Increment today's request counter for a key and return the new count (ApiKeyUsage has no RLS, so this
 * runs on the app connection). One atomic upsert per request — the basis for the daily quota.
 */
export async function recordApiKeyUsage(apiKeyId: string): Promise<number> {
  const day = utcDay();
  const row = await prisma.apiKeyUsage.upsert({
    where: { apiKeyId_day: { apiKeyId, day } },
    create: { apiKeyId, day, count: 1 },
    update: { count: { increment: 1 } },
    select: { count: true },
  });
  return row.count;
}

/** Today's request count per key (for the management UI). Keyed by apiKeyId. */
export async function getApiKeyUsageToday(apiKeyIds: string[]): Promise<Map<string, number>> {
  if (apiKeyIds.length === 0) return new Map();
  const rows = await prisma.apiKeyUsage.findMany({
    where: { apiKeyId: { in: apiKeyIds }, day: utcDay() },
    select: { apiKeyId: true, count: true },
  });
  return new Map(rows.map((r) => [r.apiKeyId, r.count]));
}

/**
 * Total API requests per UTC day over the last `days` (summed across the given keys), oldest→newest,
 * with missing days filled as 0. Powers the usage sparkline. Day strings compare lexically (ISO).
 */
export async function getApiUsageHistory(
  apiKeyIds: string[],
  days = 14,
): Promise<{ day: string; count: number }[]> {
  const series = (from: number) =>
    Array.from({ length: days }, (_, i) => utcDay(new Date(from - (days - 1 - i) * 86_400_000)));
  const now = Date.now();
  const wanted = series(now);
  if (apiKeyIds.length === 0) return wanted.map((day) => ({ day, count: 0 }));

  const rows = await prisma.apiKeyUsage.groupBy({
    by: ["day"],
    where: { apiKeyId: { in: apiKeyIds }, day: { gte: wanted[0] } },
    _sum: { count: true },
  });
  const byDay = new Map(rows.map((r) => [r.day, r._sum.count ?? 0]));
  return wanted.map((day) => ({ day, count: byDay.get(day) ?? 0 }));
}
