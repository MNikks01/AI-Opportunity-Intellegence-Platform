import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "./server";

describe("buildServer", () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    app = await buildServer();
  });
  afterAll(async () => {
    await app.close();
  });

  it("serves health", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });

  it("gates the Clerk webhook when unconfigured (503)", async () => {
    const saved = process.env.CLERK_WEBHOOK_SECRET;
    delete process.env.CLERK_WEBHOOK_SECRET;
    try {
      const res = await app.inject({
        method: "POST",
        url: "/webhooks/clerk",
        payload: { type: "user.created", data: { id: "x" } },
      });
      expect(res.statusCode).toBe(503);
    } finally {
      if (saved !== undefined) process.env.CLERK_WEBHOOK_SECRET = saved;
    }
  });

  it("gates the Stripe webhook when unconfigured (503)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/webhooks/stripe",
      payload: { type: "customer.subscription.updated", data: { object: {} } },
    });
    expect(res.statusCode).toBe(503);
  });
});
