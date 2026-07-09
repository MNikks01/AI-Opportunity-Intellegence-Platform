import { extractApiKey, hashApiKey } from "@aioi/auth";
import { findApiKeyByHash, touchApiKey } from "@aioi/database";

/**
 * Optional API-key auth for the public read API. Anonymous requests are allowed (capped at a small
 * limit); a valid `Authorization: Bearer aioi_…` key raises the cap and records usage.
 */
export async function apiAuth(req: Request): Promise<{ authed: boolean; organizationId?: string }> {
  const headers = Object.fromEntries(req.headers.entries());
  const raw = extractApiKey({ headers });
  if (!raw) return { authed: false };

  const record = await findApiKeyByHash(hashApiKey(raw));
  if (!record || record.revokedAt) return { authed: false };

  // Fire-and-forget usage stamp; never block the response on it.
  void touchApiKey(record.organizationId, record.id).catch(() => {});
  return { authed: true, organizationId: record.organizationId };
}

/** Anonymous requests are capped low; authenticated keys get the full limit. */
export const ANON_MAX_LIMIT = 25;
export const AUTHED_MAX_LIMIT = 100;
