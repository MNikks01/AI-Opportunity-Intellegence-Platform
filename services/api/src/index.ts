/**
 * @aioi/api
 * Fastify: tRPC (internal) + REST/OpenAPI (public). Single business-logic layer.
 */
export { appRouter, type AppRouter } from "./router";
export { buildServer } from "./server";
export { createContext, type Context } from "./trpc";
// Entrypoint lives in ./main.ts (run: tsx src/main.ts).
