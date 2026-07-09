import { extractApiKey, hashApiKey } from "@aioi/auth";
import { findApiKeyByHash, touchApiKey, recordApiKeyUsage, getEntitlements } from "@aioi/database";

/**
 * Optional API-key auth + plan-aware daily rate limiting for the public read API. Anonymous requests are
 * allowed (capped at a small limit); a valid `Authorization: Bearer aioi_…` key raises the cap, records
 * usage, and counts against the org plan's daily quota — over quota, the route returns 429.
 */
export interface ApiAuth {
  authed: boolean;
  organizationId?: string;
  /** Requests made today with this key (authed only). */
  used: number;
  /** The org plan's daily quota (authed only). */
  quota: number;
  /** True once today's usage exceeds the quota. */
  overQuota: boolean;
}

export async function apiAuth(req: Request): Promise<ApiAuth> {
  const headers = Object.fromEntries(req.headers.entries());
  const raw = extractApiKey({ headers });
  if (!raw) return { authed: false, used: 0, quota: 0, overQuota: false };

  const record = await findApiKeyByHash(hashApiKey(raw));
  if (!record || record.revokedAt) return { authed: false, used: 0, quota: 0, overQuota: false };

  void touchApiKey(record.organizationId, record.id).catch(() => {});
  let used = 0;
  try {
    used = await recordApiKeyUsage(record.id);
  } catch {
    // If the counter write fails, fail open (don't block a valid key).
  }
  const quota = (await getEntitlements(record.organizationId)).apiDailyQuota;
  return {
    authed: true,
    organizationId: record.organizationId,
    used,
    quota,
    overQuota: used > quota,
  };
}

/** Anonymous requests are capped low; authenticated keys get the full limit. */
export const ANON_MAX_LIMIT = 25;
export const AUTHED_MAX_LIMIT = 100;

/** Standard rate-limit response headers for an authenticated request. */
export function rateLimitHeaders(auth: ApiAuth): Record<string, string> {
  if (!auth.authed) return {};
  return {
    "x-ratelimit-limit": String(auth.quota),
    "x-ratelimit-remaining": String(Math.max(0, auth.quota - auth.used)),
  };
}
