/** tRPC init + request context. Auth/RBAC/tenant guard are wired here in Sprint 2+ (Clerk). */
import { initTRPC, TRPCError } from "@trpc/server";
import type { FastifyRequest } from "fastify";

export interface Context {
  /** Populated by the auth adapter (Clerk) — null for public read endpoints for now. */
  orgId: string | null;
  userId: string | null;
}

export function createContext(_req?: FastifyRequest): Context {
  // TODO(B-014): resolve org/user from Clerk session + set RLS org context.
  return { orgId: null, userId: null };
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export { TRPCError };
