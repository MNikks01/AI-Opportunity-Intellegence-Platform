/**
 * RBAC checks. Deny-by-default. `can` is a boolean check; `requirePermission` throws for use at the
 * top of a handler. Errors carry a machine `code` so the transport layer can map them (401/403).
 */
import type { AuthContext } from "./types";
import { ROLE_PERMISSIONS, type Permission } from "./permissions";

export class UnauthenticatedError extends Error {
  readonly code = "UNAUTHENTICATED" as const;
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthenticatedError";
  }
}

export class ForbiddenError extends Error {
  readonly code = "FORBIDDEN" as const;
  constructor(public readonly permission: Permission) {
    super(`Missing permission: ${permission}`);
    this.name = "ForbiddenError";
  }
}

/**
 * True if the context grants the action. Deny-by-default. API-key contexts are gated by their
 * `scopes` (a scope-down); user contexts by their role.
 */
export function can(ctx: AuthContext | null, permission: Permission): boolean {
  if (!ctx) return false;
  if (ctx.scopes) return ctx.scopes.includes(permission);
  return ROLE_PERMISSIONS[ctx.role].includes(permission);
}

/**
 * Assert the context is authenticated AND has the permission. Throws UnauthenticatedError (no ctx)
 * or ForbiddenError (no permission). Call at the top of every mutating/privileged handler.
 */
export function requirePermission(
  ctx: AuthContext | null,
  permission: Permission,
): asserts ctx is AuthContext {
  if (!ctx) throw new UnauthenticatedError();
  if (!can(ctx, permission)) throw new ForbiddenError(permission);
}
