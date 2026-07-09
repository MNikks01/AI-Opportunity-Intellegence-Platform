/**
 * Watchlist + WatchlistItem data access (B-016). Every operation runs inside `withOrgContext(orgId)`,
 * so RLS scopes reads/writes to the caller's org and cross-tenant access is impossible even if an id
 * from another org is supplied (a non-visible row simply isn't found). The orgId comes from the
 * authenticated context (@aioi/auth) — never from client input.
 */
import type { Prisma, $Enums } from "@prisma/client";
import { entitlementsFor, withinLimit, PlanLimitError } from "@aioi/billing";
import { withOrgContext } from "./rls";
import {
  type CreateWatchlistInput,
  type RenameWatchlistInput,
  type WatchlistItemInput,
} from "@aioi/validation";

export class NotFoundError extends Error {
  readonly code = "NOT_FOUND" as const;
  constructor(resource = "resource") {
    super(`${resource} not found`);
    this.name = "NotFoundError";
  }
}

/** Load a watchlist that is visible in the current org, or throw NotFound. */
async function requireWatchlist(tx: Prisma.TransactionClient, id: string) {
  const wl = await tx.watchlist.findFirst({ where: { id } });
  if (!wl) throw new NotFoundError("watchlist");
  return wl;
}

export function createWatchlist(orgId: string, input: CreateWatchlistInput) {
  return withOrgContext(orgId, async (tx) => {
    const ws = await tx.workspace.findFirst({ where: { id: input.workspaceId } });
    if (!ws) throw new NotFoundError("workspace"); // RLS: only our org's workspace is visible

    // Enforce the plan's watchlist limit (B-020). No subscription row → FREE.
    const sub = await tx.subscription.findFirst();
    const limit = entitlementsFor(sub?.plan ?? "FREE").maxWatchlists;
    const count = await tx.watchlist.count();
    if (!withinLimit(limit, count)) throw new PlanLimitError("watchlists");

    return tx.watchlist.create({
      data: { organizationId: orgId, workspaceId: input.workspaceId, name: input.name },
    });
  });
}

export function listWatchlists(orgId: string) {
  return withOrgContext(orgId, (tx) =>
    tx.watchlist.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { items: true } } },
    }),
  );
}

/** Number of watchlists in the org — for usage-vs-limit display. */
export function countWatchlists(orgId: string): Promise<number> {
  return withOrgContext(orgId, (tx) => tx.watchlist.count());
}

export function getWatchlist(orgId: string, id: string) {
  return withOrgContext(orgId, async (tx) => {
    const wl = await tx.watchlist.findFirst({
      where: { id },
      include: { items: { orderBy: { createdAt: "desc" } } },
    });
    if (!wl) throw new NotFoundError("watchlist");
    return wl;
  });
}

export function renameWatchlist(orgId: string, input: RenameWatchlistInput) {
  return withOrgContext(orgId, async (tx) => {
    await requireWatchlist(tx, input.id);
    return tx.watchlist.update({ where: { id: input.id }, data: { name: input.name } });
  });
}

export function deleteWatchlist(orgId: string, id: string) {
  return withOrgContext(orgId, async (tx) => {
    await requireWatchlist(tx, id);
    await tx.watchlist.delete({ where: { id } }); // cascades items + alerts
    return { id };
  });
}

export function addWatchlistItem(orgId: string, input: WatchlistItemInput) {
  return withOrgContext(orgId, async (tx) => {
    await requireWatchlist(tx, input.watchlistId);
    return tx.watchlistItem.upsert({
      where: {
        watchlistId_targetType_targetId: {
          watchlistId: input.watchlistId,
          targetType: input.targetType,
          targetId: input.targetId,
        },
      },
      create: input,
      update: {},
    });
  });
}

export function removeWatchlistItem(orgId: string, watchlistId: string, itemId: string) {
  return withOrgContext(orgId, async (tx) => {
    await requireWatchlist(tx, watchlistId);
    const res = await tx.watchlistItem.deleteMany({ where: { id: itemId, watchlistId } });
    if (res.count === 0) throw new NotFoundError("item");
    return { id: itemId };
  });
}

export function listWatchlistItems(orgId: string, watchlistId: string) {
  return withOrgContext(orgId, async (tx) => {
    await requireWatchlist(tx, watchlistId);
    return tx.watchlistItem.findMany({ where: { watchlistId }, orderBy: { createdAt: "desc" } });
  });
}

// ── quick-watch helpers (a one-click toggle bound to a primary watchlist, B-016) ──────────────

/** The org's primary (most-recent) watchlist, creating a default "My watchlist" if none exists. */
export function getOrCreatePrimaryWatchlist(
  orgId: string,
  workspaceId: string,
): Promise<{ id: string }> {
  return withOrgContext(orgId, async (tx) => {
    const existing = await tx.watchlist.findFirst({
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (existing) return existing;
    const ws = await tx.workspace.findFirst({ where: { id: workspaceId } });
    if (!ws) throw new NotFoundError("workspace");
    return tx.watchlist.create({
      data: { organizationId: orgId, workspaceId, name: "My watchlist" },
      select: { id: true },
    });
  });
}

/** Target ids of a given type watched in a watchlist — powers the "watching" state on cards. */
export function listWatchedTargetIds(
  orgId: string,
  watchlistId: string,
  targetType: $Enums.WatchTargetType = "TREND",
): Promise<Set<string>> {
  return withOrgContext(orgId, async (tx) => {
    const items = await tx.watchlistItem.findMany({
      where: { watchlistId, targetType },
      select: { targetId: true },
    });
    return new Set(items.map((i) => i.targetId));
  });
}

/** Remove a watchlist item by its target (e.g. a trend id) rather than item id. Idempotent. */
export function removeWatchlistItemByTarget(
  orgId: string,
  watchlistId: string,
  targetType: $Enums.WatchTargetType,
  targetId: string,
): Promise<{ targetId: string }> {
  return withOrgContext(orgId, async (tx) => {
    await tx.watchlistItem.deleteMany({ where: { watchlistId, targetType, targetId } });
    return { targetId };
  });
}
