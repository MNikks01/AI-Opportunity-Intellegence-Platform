import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { PlanLimitError } from "@aioi/billing";
import { prisma } from "./client";
import { bootstrapUser } from "./bootstrap";
import { createWatchlist } from "./watchlists";
import { createAlert } from "./alerts";
import { getPlan, getEntitlements, setPlan } from "./subscription";

const enabled = Boolean(process.env.DATABASE_URL) && Boolean(process.env.APP_DATABASE_URL);
const orgIds: string[] = [];
const userIds: string[] = [];

async function tenant() {
  const clerkId = `clerk_${randomUUID().slice(0, 12)}`;
  const r = await bootstrapUser({ clerkId, email: `${clerkId}@example.com` });
  orgIds.push(r.organizationId);
  userIds.push(r.userId);
  return { orgId: r.organizationId, workspaceId: r.workspaceId! };
}

describe.skipIf(!enabled)("subscription + entitlements (integration)", () => {
  afterAll(async () => {
    for (const id of orgIds) await prisma.organization.delete({ where: { id } }).catch(() => {});
    for (const id of userIds) await prisma.user.delete({ where: { id } }).catch(() => {});
  });

  it("defaults to FREE and upgrades to PRO", async () => {
    const { orgId } = await tenant();
    expect(await getPlan(orgId)).toBe("FREE");
    expect((await getEntitlements(orgId)).semanticSearch).toBe(false);

    await setPlan(orgId, "PRO");
    expect(await getPlan(orgId)).toBe("PRO");
    expect((await getEntitlements(orgId)).maxWatchlists).toBe(-1);
  });

  it("enforces the FREE watchlist limit; PRO lifts it", async () => {
    const { orgId, workspaceId } = await tenant();
    for (let i = 0; i < 5; i++) {
      await createWatchlist(orgId, { workspaceId, name: `wl-${i}` }); // FREE allows 5
    }
    await expect(createWatchlist(orgId, { workspaceId, name: "over" })).rejects.toBeInstanceOf(
      PlanLimitError,
    );

    await setPlan(orgId, "PRO");
    const extra = await createWatchlist(orgId, { workspaceId, name: "pro-ok" });
    expect(extra.name).toBe("pro-ok");
  });

  it("enforces the FREE alert limit; PRO lifts it", async () => {
    const { orgId, workspaceId } = await tenant();
    const wl = await createWatchlist(orgId, { workspaceId, name: "alerts-wl" });
    const trigger = { type: "NEW_TREND" as const };
    for (let i = 0; i < 10; i++) {
      await createAlert(orgId, {
        watchlistId: wl.id,
        trigger,
        channel: "IN_APP",
        cadence: "INSTANT",
      }); // FREE allows 10
    }
    await expect(
      createAlert(orgId, { watchlistId: wl.id, trigger, channel: "IN_APP", cadence: "INSTANT" }),
    ).rejects.toBeInstanceOf(PlanLimitError);

    await setPlan(orgId, "PRO");
    const ok = await createAlert(orgId, {
      watchlistId: wl.id,
      trigger,
      channel: "IN_APP",
      cadence: "INSTANT",
    });
    expect(ok.watchlistId).toBe(wl.id);
  });
});
