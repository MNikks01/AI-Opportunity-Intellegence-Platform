/**
 * Tenant guard. Enforces that a request is bound to an organization before any tenant data is
 * touched. The org id is ALWAYS taken from the authenticated context — never from client input.
 * The Postgres RLS transaction helper lives in @aioi/database (it needs Prisma); this stays pure.
 */
import type { AuthContext } from "./types";
import { UnauthenticatedError } from "./rbac";

/**
 * Assert an authenticated, org-scoped context and return it narrowed. Use before any tenant query.
 */
export function tenantGuard(ctx: AuthContext | null): AuthContext {
  if (!ctx || !ctx.orgId) throw new UnauthenticatedError("No organization context");
  return ctx;
}

/**
 * Reject a client-supplied org id that doesn't match the session's org (defense against tampering).
 * Prefer never accepting a client org id at all; use this only where a body carries one for convenience.
 */
export function assertOrg(ctx: AuthContext, claimedOrgId: string | undefined): void {
  if (claimedOrgId && claimedOrgId !== ctx.orgId) {
    throw new UnauthenticatedError("Organization mismatch");
  }
}
