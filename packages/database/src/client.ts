/** Prisma client singleton (avoids exhausting connections in dev/HMR). */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Prisma 7 connects through a driver adapter (node-postgres) instead of a bundled query-engine binary.
 *
 * Runtime connects as the restricted app role via APP_DATABASE_URL so RLS enforces (ADR-0003 / B-027);
 * falls back to DATABASE_URL when unset. Migrations run separately via the Prisma CLI on DATABASE_URL
 * (the owner) — see prisma.config.ts. The adapter's connection string is what scopes the client to the
 * restricted role.
 *
 * Use `||`, not `??`: GitHub Actions injects an unset secret as an empty string (not undefined), so
 * `??` would keep `""` and the pg adapter would silently default to localhost → ECONNREFUSED. Treating
 * an empty value as "unset" is the documented intent.
 */
const runtimeUrl = process.env.APP_DATABASE_URL || process.env.DATABASE_URL;

const adapter = new PrismaPg({ connectionString: runtimeUrl });

export const prisma: PrismaClient = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
