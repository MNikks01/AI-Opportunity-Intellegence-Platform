/**
 * Core auth types. Kept provider-neutral so Clerk (today) can be swapped for Auth.js later without
 * touching consumers (ADR-0001 D3, ADR-0002).
 */

/** Organization roles (mirrors the Prisma `Role` enum). */
export type Role = "OWNER" | "ADMIN" | "MEMBER" | "BILLING" | "VIEWER";

/** The authenticated request context every handler resolves. `orgId` is the tenant boundary. */
export interface AuthContext {
  userId: string;
  orgId: string;
  role: Role;
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
