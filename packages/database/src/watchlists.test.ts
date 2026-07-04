import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./client";
import { bootstrapUser } from "./bootstrap";
import {
  NotFoundError,
  createWatchlist,
  listWatchlists,
  getWatchlist,
  renameWatchlist,
  deleteWatchlist,
  addWatchlistItem,
  removeWatchlistItem,
  listWatchlistItems,
} from "./watchlists";

// Needs a live Postgres AND the restricted runtime role (APP_DATABASE_URL) for real isolation.
const enabled = Boolean(process.env.DATABASE_URL) && Boolean(process.env.APP_DATABASE_URL);
const orgIds: string[] = [];
const userIds: string[] = [];

let orgA: string, wsA: string, orgB: string, wsB: string;

async function tenant() {
  const clerkId = `clerk_${randomUUID().slice(0, 12)}`;
  const r = await bootstrapUser({ clerkId, email: `${clerkId}@example.com` });
  orgIds.push(r.organizationId);
  userIds.push(r.userId);
  return { orgId: r.organizationId, workspaceId: r.workspaceId! };
}

describe.skipIf(!enabled)("watchlists repository (integration)", () => {
  beforeAll(async () => {
    ({ orgId: orgA, workspaceId: wsA } = await tenant());
    ({ orgId: orgB, workspaceId: wsB } = await tenant());
  });
  afterAll(async () => {
    for (const id of orgIds) await prisma.organization.delete({ where: { id } }).catch(() => {});
    for (const id of userIds) await prisma.user.delete({ where: { id } }).catch(() => {});
  });

  it("creates, lists, renames, and reads a watchlist", async () => {
    const wl = await createWatchlist(orgA, { workspaceId: wsA, name: "AI infra" });
    expect(wl.organizationId).toBe(orgA);

    const list = await listWatchlists(orgA);
    expect(list.some((w) => w.id === wl.id)).toBe(true);

    const renamed = await renameWatchlist(orgA, { id: wl.id, name: "AI infrastructure" });
    expect(renamed.name).toBe("AI infrastructure");

    const fetched = await getWatchlist(orgA, wl.id);
    expect(fetched.id).toBe(wl.id);
  });

  it("adds, lists, and removes items", async () => {
    const wl = await createWatchlist(orgA, { workspaceId: wsA, name: "items" });
    const item = await addWatchlistItem(orgA, {
      watchlistId: wl.id,
      targetType: "TREND",
      targetId: "t1",
    });
    // idempotent add (unique target)
    const again = await addWatchlistItem(orgA, {
      watchlistId: wl.id,
      targetType: "TREND",
      targetId: "t1",
    });
    expect(again.id).toBe(item.id);

    const items = await listWatchlistItems(orgA, wl.id);
    expect(items).toHaveLength(1);

    await removeWatchlistItem(orgA, wl.id, item.id);
    expect(await listWatchlistItems(orgA, wl.id)).toHaveLength(0);
  });

  it("isolates watchlists across orgs", async () => {
    const wl = await createWatchlist(orgA, { workspaceId: wsA, name: "secret" });
    expect((await listWatchlists(orgB)).some((w) => w.id === wl.id)).toBe(false);
    await expect(getWatchlist(orgB, wl.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(deleteWatchlist(orgB, wl.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects a workspace from another org (cannot cross tenants on create)", async () => {
    await expect(createWatchlist(orgA, { workspaceId: wsB, name: "x" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("isolates items across orgs (child-table RLS)", async () => {
    const wl = await createWatchlist(orgA, { workspaceId: wsA, name: "with-item" });
    const item = await addWatchlistItem(orgA, {
      watchlistId: wl.id,
      targetType: "ENTITY",
      targetId: "e1",
    });
    await expect(listWatchlistItems(orgB, wl.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(removeWatchlistItem(orgB, wl.id, item.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});
