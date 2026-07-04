/**
 * @aioi/database
 * Prisma client + data-access layer (Postgres + pgvector). The only place that talks to Prisma.
 */
export { prisma } from "./client";
export * from "./repositories";
export { withOrgContext } from "./rls";
export { $Enums, Prisma } from "@prisma/client";
