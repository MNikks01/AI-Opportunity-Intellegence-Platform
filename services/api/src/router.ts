/** Application tRPC router — read models over the intelligence core + tenant CRUD. */
import { z } from "zod";
import { cached } from "@aioi/cache";
import {
  getTrendBySlug,
  listTrends,
  searchTrends,
  semanticSearchTrends,
  persistActionPlan,
  NotFoundError,
  createWatchlist,
  listWatchlists,
  getWatchlist,
  renameWatchlist,
  deleteWatchlist,
  addWatchlistItem,
  removeWatchlistItem,
  listWatchlistItems,
  createAlert,
  listAlerts,
  setAlertEnabled,
  deleteAlert,
  listNotifications,
  unreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  listAuditLogs,
  generateDailyBrief,
  listBriefs,
  getBrief,
  markBriefOpened,
  getPlan,
  setPlan,
  createApiKey,
  listApiKeys,
  revokeApiKey,
  exportOrgData,
  deleteOrg,
  getSourceStats,
} from "@aioi/database";
import { entitlementsFor, PlanLimitError } from "@aioi/billing";
import { getBillingProvider } from "./stripe";
import {
  createWatchlistSchema,
  renameWatchlistSchema,
  watchlistItemSchema,
  createAlertSchema,
} from "@aioi/validation";
import { generateActionPlan } from "@aioi/ai-service";
import { authorize, protectedProcedure, publicProcedure, router, TRPCError } from "./trpc";

/** Map data-layer errors to tRPC codes; rethrow everything else. */
function toTRPC(err: unknown): never {
  if (err instanceof NotFoundError)
    throw new TRPCError({ code: "NOT_FOUND", message: err.message });
  if (err instanceof PlanLimitError)
    throw new TRPCError({ code: "FORBIDDEN", message: err.message });
  throw err;
}

export const appRouter = router({
  health: publicProcedure.query(() => ({ status: "ok" as const })),

  trends: router({
    list: publicProcedure
      .input(z.object({ limit: z.number().int().min(1).max(100).default(25) }).optional())
      .query(({ input }) => {
        const limit = input?.limit ?? 25;
        return cached(`trends:list:${limit}`, 60, () => listTrends(limit));
      }),

    bySlug: publicProcedure
      .input(z.object({ slug: z.string().min(1) }))
      .query(async ({ input }) => {
        const trend = await getTrendBySlug(input.slug);
        if (!trend) throw new TRPCError({ code: "NOT_FOUND", message: "Trend not found" });
        return trend;
      }),

    search: publicProcedure
      .input(
        z.object({
          q: z.string().min(1).max(200),
          limit: z.number().int().min(1).max(50).default(25),
        }),
      )
      .query(({ input }) =>
        cached(`trends:search:kw:${input.q}:${input.limit}`, 30, () =>
          searchTrends(input.q, input.limit),
        ),
      ),

    // Semantic (vector) search is a paid entitlement — requires auth + a plan that grants it.
    semanticSearch: protectedProcedure
      .input(
        z.object({
          q: z.string().min(1).max(200),
          limit: z.number().int().min(1).max(50).default(25),
        }),
      )
      .query(async ({ ctx, input }) => {
        authorize(ctx.auth, "search:read");
        if (!entitlementsFor(await getPlan(ctx.auth.orgId)).semanticSearch)
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Semantic search requires a Pro or Team plan.",
          });
        return cached(`trends:search:sem:${input.q}:${input.limit}`, 30, () =>
          semanticSearchTrends(input.q, input.limit),
        );
      }),

    // Generate + persist the "what to build" action plan for a trend (admin, expensive).
    generateActionPlan: protectedProcedure
      .input(z.object({ slug: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        authorize(ctx.auth, "admin:access");
        const trend = await getTrendBySlug(input.slug);
        if (!trend) throw new TRPCError({ code: "NOT_FOUND", message: "Trend not found" });
        const plan = await generateActionPlan(
          { title: trend.title, summary: trend.summary },
          trend.scores,
        );
        await persistActionPlan(trend.id, plan.promptVersion, plan.content);
        return plan;
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

  alerts: router({
    list: protectedProcedure
      .input(z.object({ watchlistId: z.string().uuid() }))
      .query(({ ctx, input }) => {
        authorize(ctx.auth, "alerts:read");
        return listAlerts(ctx.auth.orgId, input.watchlistId).catch(toTRPC);
      }),

    create: protectedProcedure.input(createAlertSchema).mutation(({ ctx, input }) => {
      authorize(ctx.auth, "alerts:write");
      return createAlert(ctx.auth.orgId, input).catch(toTRPC);
    }),

    setEnabled: protectedProcedure
      .input(z.object({ id: z.string().uuid(), enabled: z.boolean() }))
      .mutation(({ ctx, input }) => {
        authorize(ctx.auth, "alerts:write");
        return setAlertEnabled(ctx.auth.orgId, input.id, input.enabled).catch(toTRPC);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(({ ctx, input }) => {
        authorize(ctx.auth, "alerts:write");
        return deleteAlert(ctx.auth.orgId, input.id).catch(toTRPC);
      }),
  }),

  notifications: router({
    list: protectedProcedure
      .input(z.object({ unreadOnly: z.boolean().default(false) }).optional())
      .query(({ ctx, input }) => {
        authorize(ctx.auth, "alerts:read");
        return listNotifications(ctx.auth.orgId, { unreadOnly: input?.unreadOnly });
      }),

    unreadCount: protectedProcedure.query(({ ctx }) => {
      authorize(ctx.auth, "alerts:read");
      return unreadNotificationCount(ctx.auth.orgId);
    }),

    markRead: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(({ ctx, input }) => {
        authorize(ctx.auth, "alerts:read");
        return markNotificationRead(ctx.auth.orgId, input.id).catch(toTRPC);
      }),

    markAllRead: protectedProcedure.mutation(({ ctx }) => {
      authorize(ctx.auth, "alerts:read");
      return markAllNotificationsRead(ctx.auth.orgId);
    }),
  }),

  audit: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }).optional())
      .query(({ ctx, input }) => {
        authorize(ctx.auth, "admin:access"); // audit trail is admin-only
        return listAuditLogs(ctx.auth.orgId, input?.limit);
      }),
  }),

  briefs: router({
    list: protectedProcedure.query(({ ctx }) => {
      authorize(ctx.auth, "briefs:read");
      return listBriefs(ctx.auth.orgId);
    }),

    byId: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(({ ctx, input }) => {
      authorize(ctx.auth, "briefs:read");
      return getBrief(ctx.auth.orgId, input.id).catch(toTRPC);
    }),

    generate: protectedProcedure.mutation(({ ctx }) => {
      authorize(ctx.auth, "briefs:read");
      return generateDailyBrief(ctx.auth.orgId);
    }),

    markOpened: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(({ ctx, input }) => {
        authorize(ctx.auth, "briefs:read");
        return markBriefOpened(ctx.auth.orgId, input.id).catch(toTRPC);
      }),
  }),

  billing: router({
    plan: protectedProcedure.query(async ({ ctx }) => {
      authorize(ctx.auth, "org:read");
      const plan = await getPlan(ctx.auth.orgId);
      return { plan, entitlements: entitlementsFor(plan) };
    }),

    setPlan: protectedProcedure
      .input(z.object({ plan: z.enum(["FREE", "PRO"]) }))
      .mutation(({ ctx, input }) => {
        authorize(ctx.auth, "billing:manage"); // OWNER/BILLING only
        return setPlan(ctx.auth.orgId, input.plan);
      }),

    // Start a Stripe Checkout to upgrade to Pro (Stub URL until Stripe is configured).
    checkout: protectedProcedure
      .input(z.object({ successUrl: z.string().url(), cancelUrl: z.string().url() }))
      .mutation(({ ctx, input }) => {
        authorize(ctx.auth, "billing:manage");
        return getBillingProvider().createCheckoutSession({
          orgId: ctx.auth.orgId,
          plan: "PRO",
          successUrl: input.successUrl,
          cancelUrl: input.cancelUrl,
        });
      }),
  }),

  apikeys: router({
    list: protectedProcedure.query(({ ctx }) => {
      authorize(ctx.auth, "apikeys:manage");
      return listApiKeys(ctx.auth.orgId);
    }),

    create: protectedProcedure
      .input(z.object({ name: z.string().min(1).max(80), scopes: z.array(z.string()).default([]) }))
      .mutation(({ ctx, input }) => {
        authorize(ctx.auth, "apikeys:manage");
        return createApiKey(ctx.auth.orgId, input.name, input.scopes); // raw returned once
      }),

    revoke: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(({ ctx, input }) => {
        authorize(ctx.auth, "apikeys:manage");
        return revokeApiKey(ctx.auth.orgId, input.id).catch(toTRPC);
      }),
  }),

  gdpr: router({
    // Data portability — export all of the org's data (admin).
    export: protectedProcedure.query(({ ctx }) => {
      authorize(ctx.auth, "admin:access");
      return exportOrgData(ctx.auth.orgId);
    }),

    // Right to erasure — hard-delete the org and all its data (owner only, irreversible).
    deleteOrg: protectedProcedure
      .input(z.object({ confirm: z.literal(true) }))
      .mutation(({ ctx }) => {
        authorize(ctx.auth, "org:delete");
        return deleteOrg(ctx.auth.orgId);
      }),
  }),

  sources: router({
    // Connector health — per-source signal counts + last-ingested time (system view, admin).
    stats: protectedProcedure.query(({ ctx }) => {
      authorize(ctx.auth, "admin:access");
      return getSourceStats();
    }),
  }),
});

export type AppRouter = typeof appRouter;
