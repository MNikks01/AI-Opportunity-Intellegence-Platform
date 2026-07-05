/** Fastify server: tRPC (internal) at /trpc + REST (public) at /api/v1 + health/readiness. */
import Fastify, { type FastifyInstance } from "fastify";
import rawBody from "fastify-raw-body";
import { fastifyTRPCPlugin, type CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { Webhook } from "svix";
import { getTrendBySlug, listTrends, prisma } from "@aioi/database";
import { appRouter } from "./router";
import { createContext } from "./trpc";
import { handleClerkUserEvent, type ClerkUserEvent } from "./clerk";
import { handleStripeEvent, stripeConfigured, verifyStripeEvent } from "./stripe";

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  // Raw body (opt-in per route) so we can verify webhook signatures.
  await app.register(rawBody, { field: "rawBody", global: false, runFirst: true });

  // Clerk webhook → provision a tenant on user.created (B-015). Inert until CLERK_WEBHOOK_SECRET is set.
  app.post("/webhooks/clerk", { config: { rawBody: true } }, async (req, reply) => {
    const secret = process.env.CLERK_WEBHOOK_SECRET;
    if (!secret) return reply.code(503).send({ error: "webhooks not configured" });
    let evt: ClerkUserEvent;
    try {
      evt = new Webhook(secret).verify(
        req.rawBody as string,
        req.headers as Record<string, string>,
      ) as ClerkUserEvent;
    } catch {
      return reply.code(400).send({ error: "invalid signature" });
    }
    await handleClerkUserEvent(evt);
    return { ok: true as const };
  });

  // Stripe webhook → sync subscription plan (B-020). Inert until Stripe is configured.
  app.post("/webhooks/stripe", { config: { rawBody: true } }, async (req, reply) => {
    if (!stripeConfigured())
      return reply.code(503).send({ error: "billing webhooks not configured" });
    const sig = req.headers["stripe-signature"];
    try {
      const evt = verifyStripeEvent(
        req.rawBody as string,
        Array.isArray(sig) ? sig[0]! : (sig ?? ""),
      );
      await handleStripeEvent(evt as unknown as Parameters<typeof handleStripeEvent>[0]);
    } catch {
      return reply.code(400).send({ error: "invalid signature" });
    }
    return { received: true as const };
  });

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
      return reply
        .code(404)
        .type("application/problem+json")
        .send({
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
