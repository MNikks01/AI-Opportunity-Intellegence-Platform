/** Application tRPC router — read models over the intelligence core + tenant CRUD. */
import { z } from "zod";
import {
  getTrendBySlug,
  listTrends,
  NotFoundError,
  createWatchlist,
  listWatchlists,
  getWatchlist,
  renameWatchlist,
  deleteWatchlist,
  addWatchlistItem,
  removeWatchlistItem,
  listWatchlistItems,
} from "@aioi/database";
import {
  createWatchlistSchema,
  renameWatchlistSchema,
  watchlistItemSchema,
} from "@aioi/validation";
import { authorize, protectedProcedure, publicProcedure, router, TRPCError } from "./trpc";

/** Map data-layer NotFound to a tRPC error; rethrow everything else. */
function toTRPC(err: unknown): never {
  if (err instanceof NotFoundError)
    throw new TRPCError({ code: "NOT_FOUND", message: err.message });
  throw err;
}

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

  watchlists: router({
    list: protectedProcedure.query(({ ctx }) => {
      authorize(ctx.auth, "watchlists:read");
      return listWatchlists(ctx.auth.orgId);
    }),

    byId: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        authorize(ctx.auth, "watchlists:read");
        return getWatchlist(ctx.auth.orgId, input.id).catch(toTRPC);
      }),

    create: protectedProcedure.input(createWatchlistSchema).mutation(({ ctx, input }) => {
      authorize(ctx.auth, "watchlists:write");
      return createWatchlist(ctx.auth.orgId, input).catch(toTRPC);
    }),

    rename: protectedProcedure.input(renameWatchlistSchema).mutation(({ ctx, input }) => {
      authorize(ctx.auth, "watchlists:write");
      return renameWatchlist(ctx.auth.orgId, input).catch(toTRPC);
    }),

    delete: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(({ ctx, input }) => {
        authorize(ctx.auth, "watchlists:write");
        return deleteWatchlist(ctx.auth.orgId, input.id).catch(toTRPC);
      }),

    items: protectedProcedure
      .input(z.object({ watchlistId: z.string().uuid() }))
      .query(({ ctx, input }) => {
        authorize(ctx.auth, "watchlists:read");
        return listWatchlistItems(ctx.auth.orgId, input.watchlistId).catch(toTRPC);
      }),

    addItem: protectedProcedure.input(watchlistItemSchema).mutation(({ ctx, input }) => {
      authorize(ctx.auth, "watchlists:write");
      return addWatchlistItem(ctx.auth.orgId, input).catch(toTRPC);
    }),

    removeItem: protectedProcedure
      .input(z.object({ watchlistId: z.string().uuid(), itemId: z.string().uuid() }))
      .mutation(({ ctx, input }) => {
        authorize(ctx.auth, "watchlists:write");
        return removeWatchlistItem(ctx.auth.orgId, input.watchlistId, input.itemId).catch(toTRPC);
      }),
  }),
});

export type AppRouter = typeof appRouter;
