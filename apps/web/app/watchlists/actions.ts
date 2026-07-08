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
} from "@aioi/database";
import { createWatchlistSchema, watchlistItemSchema, createAlertSchema } from "@aioi/validation";
import { getDevOrg } from "../lib/dev-org";

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
  await createWatchlist(organizationId, parsed.data);
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
      : { type: "NEW_TREND" as const };
  const parsed = createAlertSchema.safeParse({ watchlistId, trigger });
  if (!parsed.success) return;
  await createAlert(organizationId, parsed.data);
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
