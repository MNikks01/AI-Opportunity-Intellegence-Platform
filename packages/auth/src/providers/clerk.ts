/**
 * Clerk auth provider. Clerk is kept an implementation detail behind this adapter (ADR-0001 D3).
 * To avoid a hard @clerk/backend dependency (and keys) in tests, verification is injected: the caller
 * supplies a `ClerkVerifier` that validates the request and returns Clerk session claims. In
 * production, wire that verifier to @clerk/backend's `verifyToken`/`authenticateRequest`.
 */
import type { AuthContext, AuthProvider, AuthRequest, Role } from "../types";

/** Subset of Clerk session claims we rely on (org-scoped session). */
export interface ClerkClaims {
  sub: string; // user id
  org_id?: string;
  org_role?: string; // e.g. "org:admin", "admin", "org:member"
  email?: string;
}

export type ClerkVerifier = (req: AuthRequest) => Promise<ClerkClaims | null>;

/** Map Clerk org roles to our Role. Override per project if custom roles are configured in Clerk. */
export function defaultRoleMap(clerkRole: string | undefined): Role {
  const r = (clerkRole ?? "").toLowerCase().replace(/^org:/, "");
  switch (r) {
    case "owner":
      return "OWNER";
    case "admin":
      return "ADMIN";
    case "billing":
      return "BILLING";
    case "viewer":
      return "VIEWER";
    default:
      return "MEMBER";
  }
}

export class ClerkAuthProvider implements AuthProvider {
  readonly name = "clerk";
  constructor(
    private readonly verify: ClerkVerifier,
    private readonly mapRole: (role: string | undefined) => Role = defaultRoleMap,
  ) {}

  async authenticate(req: AuthRequest): Promise<AuthContext | null> {
    const claims = await this.verify(req);
    if (!claims || !claims.org_id) return null; // require an active org (multi-tenant boundary)
    return {
      userId: claims.sub,
      orgId: claims.org_id,
      role: this.mapRole(claims.org_role),
      email: claims.email,
    };
  }
}
