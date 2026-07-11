import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { AlertTrigger } from "@aioi/validation";
import {
  prisma,
  bootstrapUser,
  createWatchlist,
  addWatchlistItem,
  createAlert,
  listNotifications,
  entityMomentumMatches,
  evaluateEntityAlertsAllOrgs,
} from "./index";

const DAY = 24 * 60 * 60 * 1000;

describe("entityMomentumMatches (pure)", () => {
  it("fires only for ENTITY_MOMENTUM at/above minDelta", () => {
    const t: AlertTrigger = { type: "ENTITY_MOMENTUM", minDelta: 2 };
    expect(entityMomentumMatches(t, 3)).toBe(true);
    expect(entityMomentumMatches(t, 2)).toBe(true);
    expect(entityMomentumMatches(t, 1)).toBe(false);
    expect(entityMomentumMatches({ type: "NEW_TREND" }, 9)).toBe(false);
  });
});

const enabled = Boolean(process.env.DATABASE_URL) && Boolean(process.env.APP_DATABASE_URL);

describe.skipIf(!enabled)("evaluateEntityAlertsAllOrgs (integration)", () => {
  it("notifies an org whose watched entity is accelerating, and de-dupes on re-run", async () => {
    const clerkId = `clerk_${randomUUID().slice(0, 12)}`;
    const { organizationId, workspaceId } = await bootstrapUser({
      clerkId,
      email: `${clerkId}@example.com`,
    });

    // A tracked entity that's accelerating (0 → 4 over the week).
    const model = await prisma.entity.create({
      data: { type: "MODEL", name: `watch-model-${clerkId}`, externalRefs: {} },
    });
    await prisma.entitySnapshot.createMany({
      data: [
        {
          entityId: model.id,
          linkedTrendCount: 1,
          signalWeight: 0,
          capturedAt: new Date(Date.now() - 7 * DAY),
        },
        { entityId: model.id, linkedTrendCount: 2, signalWeight: 4, capturedAt: new Date() },
      ],
    });

    // Watch it + an ENTITY_MOMENTUM alert.
    const wl = await createWatchlist(organizationId, { workspaceId: workspaceId!, name: "Supply" });
    await addWatchlistItem(organizationId, {
      watchlistId: wl.id,
      targetType: "ENTITY",
      targetId: model.id,
    });
    await createAlert(organizationId, {
      watchlistId: wl.id,
      trigger: { type: "ENTITY_MOMENTUM", minDelta: 1 },
      channel: "IN_APP",
      cadence: "INSTANT",
    });

    const first = await evaluateEntityAlertsAllOrgs();
    expect(first.notifications).toBeGreaterThanOrEqual(1);
    const notes = await listNotifications(organizationId);
    const note = notes.find((n) => n.targetType === "ENTITY" && n.targetId === model.id);
    expect(note).toBeTruthy();
    expect(note!.title).toContain("accelerating");

    // Re-run while the notification is unread → no duplicate.
    await evaluateEntityAlertsAllOrgs();
    const after = (await listNotifications(organizationId)).filter(
      (n) => n.targetType === "ENTITY" && n.targetId === model.id,
    );
    expect(after).toHaveLength(1);

    await prisma.entity.delete({ where: { id: model.id } });
    await prisma.organization.delete({ where: { id: organizationId } });
  });
});
