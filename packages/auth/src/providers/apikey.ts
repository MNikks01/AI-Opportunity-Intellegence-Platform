/**
 * API-key authentication. Public API clients send `Authorization: Bearer aioi_<secret>`. We store only
 * a SHA-256 hash of the key (never the raw secret); lookup is by hash. The key carries scopes (a
 * scope-down of permissions) and belongs to an org — that org becomes the tenant boundary.
 *
 * The hash lookup is injected (`ApiKeyLookup`) so this stays decoupled from @aioi/database. Because the
 * key determines the org *before* any org context exists, the lookup must run via a privileged path
 * (owner role or a SECURITY DEFINER function) — see the repository wiring, not here.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { AuthContext, AuthProvider, AuthRequest } from "../types";
import type { Permission } from "../permissions";

const KEY_PREFIX = "aioi";

/** SHA-256 hex of a raw key. Deterministic — used for both storage and lookup. */
export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Mint a new key: return the raw secret (shown once), its hash (stored), and a display prefix. */
export function generateApiKey(prefix: string = KEY_PREFIX): {
  raw: string;
  hash: string;
  display: string;
} {
  const raw = `${prefix}_${randomBytes(24).toString("base64url")}`;
  return { raw, hash: hashApiKey(raw), display: `${raw.slice(0, 12)}…` };
}

/** Constant-time compare of two hex hashes (defense against timing oracles). */
export function hashesEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export interface ApiKeyRecord {
  id: string;
  organizationId: string;
  scopes: readonly Permission[];
  revokedAt: Date | null;
}

export type ApiKeyLookup = (hash: string) => Promise<ApiKeyRecord | null>;

/** Pull the raw key from `Authorization: Bearer <key>`; only our-prefixed keys qualify. */
export function extractApiKey(req: AuthRequest, prefix: string = KEY_PREFIX): string | null {
  const header = req.headers["authorization"] ?? req.headers["Authorization"];
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) return null;
  const match = /^Bearer\s+(.+)$/i.exec(value);
  const token = match?.[1]?.trim();
  return token && token.startsWith(`${prefix}_`) ? token : null;
}

export class ApiKeyAuthProvider implements AuthProvider {
  readonly name = "apikey";
  constructor(
    private readonly lookup: ApiKeyLookup,
    private readonly onUsed?: (id: string) => void,
  ) {}

  async authenticate(req: AuthRequest): Promise<AuthContext | null> {
    const raw = extractApiKey(req);
    if (!raw) return null;
    const record = await this.lookup(hashApiKey(raw));
    if (!record || record.revokedAt) return null; // unknown or revoked → deny
    this.onUsed?.(record.id);
    return {
      userId: `apikey:${record.id}`,
      orgId: record.organizationId,
      role: "VIEWER", // nominal; API-key access is gated by `scopes`, not role
      kind: "apikey",
      scopes: record.scopes,
    };
  }
}
