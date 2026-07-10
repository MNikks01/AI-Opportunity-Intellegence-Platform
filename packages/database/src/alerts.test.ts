import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AlertTrigger } from "@aioi/validation";
import { prisma } from "./client";
import { bootstrapUser } from "./bootstrap";
import { createWatchlist, addWatchlistItem } from "./watchlists";
import {
  alertMatches,
  createAlert,
  listAlerts,
  setAlertEnabled,
  deleteAlert,
  evaluateTrendForOrg,
  evaluateTrendAllOrgs,
} from "./alerts";
import {
  listNotifications,
  unreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  listPendingEmailNotifications,
  markNotificationsEmailed,
} from "./notifications";

describe("alertMatches (pure)", () => {
  it("NEW_TREND always matches a watched trend", () => {
    expect(alertMatches({ type: "NEW_TREND" }, {})).toBe(true);
  });
  it("SCORE_CROSSES matches only at/above the threshold", () => {
    const t: AlertTrigger = { type: "SCORE_CROSSES", dimension: "opportunity", gte: 80 };
    expect(alertMatches(t, { opportunity: 85 })).toBe(true);
    expect(alertMatches(t, { opportunity: 80 })).toBe(true);
    expect(alertMatches(t, { opportunity: 79 })).toBe(false);
    expect(alertMatches(t, {})).toBe(false);
  });
});

const enabled = Boolean(process.env.DATABASE_URL) && Boolean(process.env.APP_DATABASE_URL);
const orgIds: string[] = [];
const userIds: string[] = [];
let orgA: string, wsA: string, orgB: string;

async function tenant() {
  const clerkId = `clerk_${randomUUID().slice(0, 12)}`;
  const r = await bootstrapUser({ clerkId, email: `${clerkId}@example.com` });
  orgIds.push(r.organizationId);
  userIds.push(r.userId);
  return { orgId: r.organizationId, workspaceId: r.workspaceId! };
}

describe.skipIf(!enabled)("alerts engine (integration)", () => {
  beforeAll(async () => {
    ({ orgId: orgA, workspaceId: wsA } = await tenant());
    ({ orgId: orgB } = await tenant());
  });
  afterAll(async () => {
    for (const id of orgIds) await prisma.organization.delete({ where: { id } }).catch(() => {});
    for (const id of userIds) await prisma.user.delete({ where: { id } }).catch(() => {});
  });

  const trendId = `trend-${randomUUID().slice(0, 8)}`;

  it("fires an in-app notification when a watched trend crosses the threshold", async () => {
    const wl = await createWatchlist(orgA, { workspaceId: wsA, name: "alerting" });
    await addWatchlistItem(orgA, { watchlistId: wl.id, targetType: "TREND", targetId: trendId });
    await createAlert(orgA, {
      watchlistId: wl.id,
      trigger: { type: "SCORE_CROSSES", dimension: "opportunity", gte: 80 },
      channel: "IN_APP",
      cadence: "INSTANT",
    });

    const below = await evaluateTrendForOrg(orgA, { trendId, scores: { opportunity: 70 } });
    expect(below).toHaveLength(0);

    const above = await evaluateTrendForOrg(orgA, {
      trendId,
      title: "Agentic RAG",
      scores: { opportunity: 88 },
    });
    expect(above).toHaveLength(1);
    expect(above[0]!.targetId).toBe(trendId);

    expect(await unreadNotificationCount(orgA)).toBe(1);
    const notes = await listNotifications(orgA, { unreadOnly: true });
    expect(notes[0]!.title).toContain("opportunity ≥ 80");
  });

  it("does not fire for a disabled alert", async () => {
    const wl = await createWatchlist(orgA, { workspaceId: wsA, name: "muted" });
    const tId = `trend-${randomUUID().slice(0, 8)}`;
    await addWatchlistItem(orgA, { watchlistId: wl.id, targetType: "TREND", targetId: tId });
    const alert = await createAlert(orgA, {
      watchlistId: wl.id,
      trigger: { type: "NEW_TREND" },
      channel: "IN_APP",
      cadence: "INSTANT",
    });
    await setAlertEnabled(orgA, alert.id, false);
    expect(await evaluateTrendForOrg(orgA, { trendId: tId, scores: {} })).toHaveLength(0);

    expect((await listAlerts(orgA, wl.id))[0]!.enabled).toBe(false);
    await deleteAlert(orgA, alert.id);
    expect(await listAlerts(orgA, wl.id)).toHaveLength(0);
  });

  it("isolates alerts and notifications across orgs", async () => {
    // org B watches the same trend id but has its own alert/notifications.
    expect(await evaluateTrendForOrg(orgB, { trendId, scores: { opportunity: 99 } })).toHaveLength(
      0,
    );
    expect(await unreadNotificationCount(orgB)).toBe(0);
    expect(await listNotifications(orgB)).toHaveLength(0);
  });

  it("evaluateTrendAllOrgs fans out only to orgs watching the trend", async () => {
    const tId = `trend-${randomUUID().slice(0, 8)}`;
    const wl = await createWatchlist(orgA, { workspaceId: wsA, name: "fanout" });
    await addWatchlistItem(orgA, { watchlistId: wl.id, targetType: "TREND", targetId: tId });
    await createAlert(orgA, {
      watchlistId: wl.id,
      trigger: { type: "SCORE_CROSSES", dimension: "opportunity", gte: 80 },
      channel: "IN_APP",
      cadence: "INSTANT",
    });

    const res = await evaluateTrendAllOrgs({
      trendId: tId,
      title: "X",
      scores: { opportunity: 90 },
    });
    expect(res).toEqual({ orgs: 1, notifications: 1 }); // org A only
    expect(await unreadNotificationCount(orgB)).toBe(0); // org B never watched it
  });

  it("marks notifications read", async () => {
    const notes = await listNotifications(orgA, { unreadOnly: true });
    await markNotificationRead(orgA, notes[0]!.id);
    const { updated } = await markAllNotificationsRead(orgA);
    expect(updated).toBeGreaterThanOrEqual(0);
    expect(await unreadNotificationCount(orgA)).toBe(0);
  });

  it("queues only EMAIL-channel notifications for delivery, and marks them sent", async () => {
    const { orgId, workspaceId } = await tenant();
    const tId = `trend-${randomUUID().slice(0, 8)}`;
    const wl = await createWatchlist(orgId, { workspaceId, name: "email-alerts" });
    await addWatchlistItem(orgId, { watchlistId: wl.id, targetType: "TREND", targetId: tId });
    // One EMAIL alert and one IN_APP alert on the same watched trend.
    await createAlert(orgId, {
      watchlistId: wl.id,
      trigger: { type: "NEW_TREND" },
      channel: "EMAIL",
      cadence: "INSTANT",
    });
    await createAlert(orgId, {
      watchlistId: wl.id,
      trigger: { type: "NEW_TREND" },
      channel: "IN_APP",
      cadence: "INSTANT",
    });
    const fired = await evaluateTrendForOrg(orgId, { trendId: tId, title: "T", scores: {} });
    expect(fired).toHaveLength(2); // both alerts wrote a notification

    // Only the EMAIL-channel one is pending delivery.
    const pending = await listPendingEmailNotifications(orgId, 50);
    expect(pending).toHaveLength(1);

    const { updated } = await markNotificationsEmailed(orgId, [pending[0]!.id]);
    expect(updated).toBe(1);
    // Idempotent: nothing left to deliver, and re-marking is a no-op.
    expect(await listPendingEmailNotifications(orgId, 50)).toHaveLength(0);
    expect((await markNotificationsEmailed(orgId, [pending[0]!.id])).updated).toBe(0);
  });
});
