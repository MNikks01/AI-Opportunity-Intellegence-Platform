/** Fastify server: tRPC (internal) at /trpc + REST (public) at /api/v1 + health/readiness. */
import Fastify, { type FastifyInstance } from "fastify";
import { fastifyTRPCPlugin, type CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { getTrendBySlug, listTrends, prisma } from "@aioi/database";
import { appRouter } from "./router";
import { createContext } from "./trpc";

export function buildServer(): FastifyInstance {
  const app = Fastify({ logger: false });

  void app.register(fastifyTRPCPlugin, {
    prefix: "/trpc",
    trpcOptions: {
      router: appRouter,
      createContext: (opts: CreateFastifyContextOptions) => createContext(opts.req),
    },
  });

  app.get("/health", () => ({ status: "ok" as const }));
  app.get("/ready", async () => {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ready" as const };
  });

  app.get<{ Querystring: { limit?: string } }>("/api/v1/trends", async (req) => {
    const limit = Math.min(Number(req.query.limit ?? 25) || 25, 100);
    return { data: await listTrends(limit) };
  });

  app.get<{ Params: { slug: string } }>("/api/v1/trends/:slug", async (req, reply) => {
    const trend = await getTrendBySlug(req.params.slug);
    if (!trend) {
      return reply.code(404).type("application/problem+json").send({
        type: "about:blank",
        title: "Not Found",
        status: 404,
        detail: `No trend with slug '${req.params.slug}'`,
        code: "trend_not_found",
      });
    }
    return trend;
  });

  return app;
}
