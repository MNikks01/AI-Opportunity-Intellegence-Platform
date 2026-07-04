/**
 * Row-Level Security helper. Runs `fn` inside a transaction with the tenant org set, so Postgres RLS
 * policies (migration 20260704000000_enable_tenant_rls) scope every query to that org. The org id
 * comes from the authenticated context (@aioi/auth) — never from client input.
 *
 * `set_config(name, value, is_local=true)` is the parameterized `SET LOCAL`; it resets at transaction
 * end, so connection reuse can't leak context between requests.
 *
 * IMPORTANT: RLS only enforces for a **non-superuser, non-BYPASSRLS** database role. In production the
 * app must connect as a restricted role (see ADR-0003 / INFRASTRUCTURE). Migrations run as the owner.
 * A client may be passed (e.g. an app-role client) — defaults to the shared singleton.
 */
import type { PrismaClient, Prisma } from "@prisma/client";
import { prisma } from "./client";

export async function withOrgContext<T>(
  orgId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  client: PrismaClient = prisma,
): Promise<T> {
  return client.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_org', ${orgId}, true)`;
    return fn(tx);
  });
}
