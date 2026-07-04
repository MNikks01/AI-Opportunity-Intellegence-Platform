/** Prisma client singleton (avoids exhausting connections in dev/HMR). */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Runtime connects as the restricted app role via APP_DATABASE_URL so RLS enforces (ADR-0003 / B-027);
 * falls back to DATABASE_URL when unset. Migrations run separately via the Prisma CLI on DATABASE_URL
 * (the owner). Setting the datasource url here overrides the schema's `env("DATABASE_URL")` for the
 * client only.
 */
const runtimeUrl = process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL;

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient(runtimeUrl ? { datasources: { db: { url: runtimeUrl } } } : undefined);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
