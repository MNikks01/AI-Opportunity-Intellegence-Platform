"use server";

import { revalidatePath } from "next/cache";
import {
  createWatchlist,
  deleteWatchlist,
  addWatchlistItem,
  removeWatchlistItem,
} from "@aioi/database";
import { createWatchlistSchema, watchlistItemSchema } from "@aioi/validation";
import { getDevOrg } from "../lib/dev-org";

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
