/**
 * tRPC init + request context. Auth/RBAC/tenant guard come from @aioi/auth (Clerk behind the
 * adapter; StubAuthProvider in dev/test). Real Clerk verification + Postgres RLS org context are
 * wired in a follow-up slice (B-014 cont.).
 */
import { initTRPC, TRPCError } from "@trpc/server";
import type { FastifyRequest } from "fastify";
import {
  getAuthProvider,
  requirePermission,
  UnauthenticatedError,
  type AuthContext,
  type Permission,
} from "@aioi/auth";

export interface Context {
  /** Authenticated, org-scoped context — null when unauthenticated. Never read org from the client. */
  auth: AuthContext | null;
}

// Provider is chosen once (Stub in dev/test; Clerk when a verifier + key are configured).
const authProvider = getAuthProvider();

export async function createContext(req?: FastifyRequest): Promise<Context> {
  const auth = await authProvider.authenticate({ headers: req?.headers ?? {} });
  return { auth };
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

/** Requires an authenticated, org-scoped context. Narrows `ctx.auth` to non-null for the resolver. */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.auth?.orgId)
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  return next({ ctx: { auth: ctx.auth } });
});

/** Enforce a permission inside a resolver; maps auth errors to tRPC codes. */
export function authorize(
  auth: AuthContext | null,
  permission: Permission,
): asserts auth is AuthContext {
  try {
    requirePermission(auth, permission);
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: err.message });
    }
    throw new TRPCError({ code: "FORBIDDEN", message: (err as Error).message });
  }
}

export { TRPCError };
