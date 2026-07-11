"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createWatchlist,
  deleteWatchlist,
  addWatchlistItem,
  removeWatchlistItem,
  createAlert,
  setAlertEnabled,
  deleteAlert,
  getOrCreatePrimaryWatchlist,
  removeWatchlistItemByTarget,
} from "@aioi/database";
import { PlanLimitError } from "@aioi/billing";
import { createWatchlistSchema, watchlistItemSchema, createAlertSchema } from "@aioi/validation";
import { getDevOrg } from "../lib/dev-org";

/**
 * One-click watch toggle for a trend (used on trend cards). Adds/removes the trend on the org's primary
 * watchlist (created on demand), then refreshes the list in place.
 */
export async function toggleWatchAction(formData: FormData): Promise<void> {
  const { organizationId, workspaceId } = await getDevOrg();
  if (!workspaceId) return;
  const trendId = String(formData.get("trendId") ?? "");
  if (!trendId) return;
  const watched = String(formData.get("watched") ?? "") === "true";
  const wl = await getOrCreatePrimaryWatchlist(organizationId, workspaceId);
  if (watched) {
    await removeWatchlistItemByTarget(organizationId, wl.id, "TREND", trendId);
  } else {
    await addWatchlistItem(organizationId, {
      watchlistId: wl.id,
      targetType: "TREND",
      targetId: trendId,
    });
  }
  revalidatePath("/trends");
}

/**
 * One-click watch toggle for a supply-side entity (model / MCP server / repo), used on entity detail.
 * Adds/removes the entity on the org's primary watchlist (B-032).
 */
export async function toggleEntityWatchAction(formData: FormData): Promise<void> {
  const { organizationId, workspaceId } = await getDevOrg();
  if (!workspaceId) return;
  const entityId = String(formData.get("entityId") ?? "");
  if (!entityId) return;
  const watched = String(formData.get("watched") ?? "") === "true";
  const wl = await getOrCreatePrimaryWatchlist(organizationId, workspaceId);
  if (watched) {
    await removeWatchlistItemByTarget(organizationId, wl.id, "ENTITY", entityId);
  } else {
    await addWatchlistItem(organizationId, {
      watchlistId: wl.id,
      targetType: "ENTITY",
      targetId: entityId,
    });
  }
  revalidatePath(`/entities/${entityId}`);
}

/** Add a trend to a watchlist from the trend page, then land the user on that watchlist. */
export async function watchTrendAction(formData: FormData): Promise<void> {
  const { organizationId } = await getDevOrg();
  const watchlistId = String(formData.get("watchlistId") ?? "");
  const parsed = watchlistItemSchema.safeParse({
    watchlistId,
    targetType: "TREND",
    targetId: String(formData.get("trendId") ?? ""),
  });
  if (!parsed.success) return;
  await addWatchlistItem(organizationId, parsed.data);
  redirect(`/watchlists/${watchlistId}`);
}

export async function createWatchlistAction(formData: FormData): Promise<void> {
  const { organizationId, workspaceId } = await getDevOrg();
  if (!workspaceId) return;
  const parsed = createWatchlistSchema.safeParse({
    workspaceId,
    name: String(formData.get("name") ?? ""),
  });
  if (!parsed.success) return;
  try {
    await createWatchlist(organizationId, parsed.data);
  } catch (e) {
    if (e instanceof PlanLimitError) redirect("/watchlists?limit=watchlists");
    throw e;
  }
  revalidatePath("/watchlists");
}

export async function deleteWatchlistAction(formData: FormData): Promise<void> {
  const { organizationId } = await getDevOrg();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteWatchlist(organizationId, id);
  revalidatePath("/watchlists");
}

export async function addItemAction(formData: FormData): Promise<void> {
  const { organizationId } = await getDevOrg();
  const parsed = watchlistItemSchema.safeParse({
    watchlistId: String(formData.get("watchlistId") ?? ""),
    targetType: String(formData.get("targetType") ?? ""),
    targetId: String(formData.get("targetId") ?? ""),
  });
  if (!parsed.success) return;
  await addWatchlistItem(organizationId, parsed.data);
  revalidatePath(`/watchlists/${parsed.data.watchlistId}`);
}

export async function removeItemAction(formData: FormData): Promise<void> {
  const { organizationId } = await getDevOrg();
  const watchlistId = String(formData.get("watchlistId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  if (!watchlistId || !itemId) return;
  await removeWatchlistItem(organizationId, watchlistId, itemId);
  revalidatePath(`/watchlists/${watchlistId}`);
}

export async function createAlertAction(formData: FormData): Promise<void> {
  const { organizationId } = await getDevOrg();
  const watchlistId = String(formData.get("watchlistId") ?? "");
  const type = String(formData.get("type") ?? "");
  const trigger =
    type === "SCORE_CROSSES"
      ? {
          type: "SCORE_CROSSES" as const,
          dimension: String(formData.get("dimension") ?? ""),
          gte: Number(formData.get("gte") ?? 0),
        }
      : type === "ENTITY_MOMENTUM"
        ? { type: "ENTITY_MOMENTUM" as const, minDelta: 1 }
        : { type: "NEW_TREND" as const };
  const parsed = createAlertSchema.safeParse({ watchlistId, trigger });
  if (!parsed.success) return;
  try {
    await createAlert(organizationId, parsed.data);
  } catch (e) {
    if (e instanceof PlanLimitError) redirect(`/watchlists/${watchlistId}?limit=alerts`);
    throw e;
  }
  revalidatePath(`/watchlists/${watchlistId}`);
}

export async function toggleAlertAction(formData: FormData): Promise<void> {
  const { organizationId } = await getDevOrg();
  const id = String(formData.get("id") ?? "");
  const watchlistId = String(formData.get("watchlistId") ?? "");
  const enabled = String(formData.get("enabled") ?? "") === "true";
  if (!id) return;
  await setAlertEnabled(organizationId, id, enabled);
  revalidatePath(`/watchlists/${watchlistId}`);
}

export async function deleteAlertAction(formData: FormData): Promise<void> {
  const { organizationId } = await getDevOrg();
  const id = String(formData.get("id") ?? "");
  const watchlistId = String(formData.get("watchlistId") ?? "");
  if (!id) return;
  await deleteAlert(organizationId, id);
  revalidatePath(`/watchlists/${watchlistId}`);
}
