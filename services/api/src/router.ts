/** Application tRPC router — read models over the intelligence core. */
import { z } from "zod";
import { getTrendBySlug, listTrends } from "@aioi/database";
import { publicProcedure, router, TRPCError } from "./trpc";

export const appRouter = router({
  health: publicProcedure.query(() => ({ status: "ok" as const })),

  trends: router({
    list: publicProcedure
      .input(z.object({ limit: z.number().int().min(1).max(100).default(25) }).optional())
      .query(({ input }) => listTrends(input?.limit ?? 25)),

    bySlug: publicProcedure
      .input(z.object({ slug: z.string().min(1) }))
      .query(async ({ input }) => {
        const trend = await getTrendBySlug(input.slug);
        if (!trend) throw new TRPCError({ code: "NOT_FOUND", message: "Trend not found" });
        return trend;
      }),
  }),
});

export type AppRouter = typeof appRouter;
