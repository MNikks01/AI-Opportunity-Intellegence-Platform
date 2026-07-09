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
