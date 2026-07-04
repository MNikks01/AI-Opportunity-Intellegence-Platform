/**
 * RBAC permission catalog + role→permission map. Single source of truth for "who can do what".
 * Matches the table in the `auth` skill. Deny-by-default: an action not granted is forbidden.
 */
import type { Role } from "./types";

export const PERMISSIONS = [
  // reads (all roles)
  "trends:read",
  "opportunities:read",
  "entities:read",
  "search:read",
  "watchlists:read",
  "alerts:read",
  "briefs:read",
  "reports:read",
  "workspace:read",
  "org:read",
  // writes
  "watchlists:write",
  "alerts:write",
  "reports:write",
  "workspace:write",
  // admin / org
  "org:members:manage",
  "org:settings:manage",
  "apikeys:manage",
  "admin:access",
  // billing
  "billing:manage",
  // destructive
  "org:delete",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const READS: Permission[] = [
  "trends:read",
  "opportunities:read",
  "entities:read",
  "search:read",
  "watchlists:read",
  "alerts:read",
  "briefs:read",
  "reports:read",
  "workspace:read",
  "org:read",
];

const WRITES: Permission[] = [
  "watchlists:write",
  "alerts:write",
  "reports:write",
  "workspace:write",
];

const ORG_ADMIN: Permission[] = [
  "org:members:manage",
  "org:settings:manage",
  "apikeys:manage",
  "admin:access",
];

/** Role → granted permissions. OWNER gets everything. */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  OWNER: [...PERMISSIONS],
  ADMIN: [...READS, ...WRITES, ...ORG_ADMIN],
  MEMBER: [...READS, ...WRITES],
  BILLING: [...READS, "billing:manage"],
  VIEWER: [...READS],
};
