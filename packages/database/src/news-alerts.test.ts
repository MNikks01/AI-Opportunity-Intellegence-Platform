import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./client";
import { bootstrapUser } from "./bootstrap";
import { createWatchlist, addWatchlistItem } from "./watchlists";
import { listNotifications, unreadNotificationCount } from "./notifications";
import {
  categoryTopic,
  evaluateSignalAllOrgs,
  evaluateSignalForOrg,
  newsTopicTargets,
  regionTopic,
} from "./news-alerts";

describe("newsTopicTargets (pure)", () => {
  it("builds region/category/model topic ids and dedupes", () => {
    const topics = newsTopicTargets({
      signalId: "s1",
      title: "x",
      region: "US",
      categoryKeys: ["ai-models", "ai-models"],
      modelNames: ["Llama"],
    });
    expect(topics).toContain("region:US");
    expect(topics).toContain("category:ai-models");
    expect(topics).toContain("model:llama"); // lowercased
    expect(new Set(topics).size).toBe(topics.length);
  });

  it("exposes helpers matching the id convention", () => {
    expect(regionTopic("CHINA")).toBe("region:CHINA");
    expect(categoryTopic("video-ai")).toBe("category:video-ai");
  });
});

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

describe.skipIf(!enabled)("news alerts (integration)", () => {
  let orgId: string, workspaceId: string;

  beforeAll(async () => {
    ({ orgId, workspaceId } = await tenant());
  });
  afterAll(async () => {
    for (const id of orgIds) await prisma.organization.delete({ where: { id } }).catch(() => {});
    for (const id of userIds) await prisma.user.delete({ where: { id } }).catch(() => {});
  });

  it("notifies an org subscribed to a region topic, cross-tenant and deduped", async () => {
    const wl = await createWatchlist(orgId, { workspaceId, name: "china-watch" });
    await addWatchlistItem(orgId, {
      watchlistId: wl.id,
      targetType: "TOPIC",
      targetId: regionTopic("CHINA"),
    });

    const match = {
      signalId: randomUUID(),
      title: "DeepSeek ships a new model",
      region: "CHINA",
      categoryKeys: ["ai-models"],
    };

    const fired = await evaluateSignalAllOrgs(match);
    expect(fired.orgs).toBeGreaterThanOrEqual(1);
    expect(fired.notifications).toBe(1);
    expect(await unreadNotificationCount(orgId)).toBeGreaterThanOrEqual(1);

    // Re-running the same signal does not duplicate.
    const again = await evaluateSignalForOrg(orgId, match);
    expect(again).toBe(0);

    const notes = await listNotifications(orgId, { unreadOnly: true });
    expect(notes.some((n) => n.targetId === "region:CHINA")).toBe(true);
  });

  it("does not notify when no topic matches", async () => {
    const before = await unreadNotificationCount(orgId);
    const fired = await evaluateSignalForOrg(orgId, {
      signalId: randomUUID(),
      title: "US-only story",
      region: "US",
      categoryKeys: ["hardware"],
    });
    expect(fired).toBe(0);
    expect(await unreadNotificationCount(orgId)).toBe(before);
  });
});
