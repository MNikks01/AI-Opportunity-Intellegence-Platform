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
import { writeAuditLog } from "@aioi/database";
import { clerkVerifier } from "./clerk";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface Context {
  /** Authenticated, org-scoped context — null when unauthenticated. Never read org from the client. */
  auth: AuthContext | null;
}

// Provider is chosen once (Stub in dev/test; Clerk when the verifier + CLERK_SECRET_KEY are set).
const authProvider = getAuthProvider({ clerkVerifier });

export async function createContext(req?: FastifyRequest): Promise<Context> {
  const auth = await authProvider.authenticate({ headers: req?.headers ?? {} });
  return { auth };
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Requires an authenticated, org-scoped context (narrows `ctx.auth` for the resolver) AND writes an
 * audit-log entry for every successful mutation (B-022). Auditing is best-effort: a failed audit write
 * never fails the mutation. `actorUserId` is a real user uuid or null (API-key/dev principals are
 * recorded in metadata).
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, type, path, next }) => {
  if (!ctx.auth?.orgId)
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  const auth = ctx.auth;
  const result = await next({ ctx: { auth } });

  if (type === "mutation" && result.ok) {
    await writeAuditLog(auth.orgId, {
      actorUserId: UUID_RE.test(auth.userId) ? auth.userId : null,
      action: path,
      metadata: { actor: auth.userId, kind: auth.kind ?? "user" },
    }).catch(() => {
      /* best-effort — never fail the mutation because auditing failed */
    });
  }
  return result;
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
