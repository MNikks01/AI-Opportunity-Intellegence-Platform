/**
 * Core auth types. Kept provider-neutral so Clerk (today) can be swapped for Auth.js later without
 * touching consumers (ADR-0001 D3, ADR-0002).
 */

import type { Permission } from "./permissions";

/** Organization roles (mirrors the Prisma `Role` enum). */
export type Role = "OWNER" | "ADMIN" | "MEMBER" | "BILLING" | "VIEWER";

/** How the principal authenticated. */
export type AuthKind = "user" | "apikey";

/**
 * The authenticated request context every handler resolves. `orgId` is the tenant boundary.
 * For API keys, `userId` is `apikey:<id>` and `scopes` restrict access (checked instead of `role`).
 */
export interface AuthContext {
  userId: string;
  orgId: string;
  role: Role;
  kind?: AuthKind;
  /** Present for API-key auth: the granted permissions (scope-down; used by `can` instead of role). */
  scopes?: readonly Permission[];
  email?: string;
}

/** Minimal request shape an AuthProvider needs (framework-neutral). */
export interface AuthRequest {
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Resolves an authenticated context from a request. Implemented by ClerkAuthProvider (prod) and
 * StubAuthProvider (dev/test). Returns null when unauthenticated / no active org.
 */
export interface AuthProvider {
  readonly name: string;
  authenticate(req: AuthRequest): Promise<AuthContext | null>;
}
