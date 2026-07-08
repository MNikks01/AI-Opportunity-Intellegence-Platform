import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Score, TrendLike } from "@aioi/shared";
import { prisma } from "./client";
import { bootstrapUser } from "./bootstrap";
import { persistScoredTrend } from "./repositories";
import { NotFoundError } from "./watchlists";
import {
  generateDailyBrief,
  listBriefs,
  getBrief,
  markBriefOpened,
  type BriefContent,
} from "./briefs";

const enabled = Boolean(process.env.DATABASE_URL) && Boolean(process.env.APP_DATABASE_URL);
const orgIds: string[] = [];
const userIds: string[] = [];
const trendSlugs: string[] = [];
let orgA: string, orgB: string;

async function org() {
  const clerkId = `clerk_${randomUUID().slice(0, 12)}`;
  const r = await bootstrapUser({ clerkId, email: `${clerkId}@example.com` });
  orgIds.push(r.organizationId);
  userIds.push(r.userId);
  return r.organizationId;
}

describe.skipIf(!enabled)("daily brief (integration)", () => {
  beforeAll(async () => {
    orgA = await org();
    orgB = await org();
    const slug = `brief-trend-${randomUUID().slice(0, 8)}`;
    trendSlugs.push(slug);
    const trend: TrendLike = {
      id: "x",
      slug,
      title: "Brief seed trend",
      summary: "s",
      status: "ACTIVE",
      signals: [{ source: "hackernews", externalId: `${slug}-1`, title: "t", text: "t" }],
    };
    const score: Score = {
      dimension: "opportunity",
      value: 91,
      band: "high",
      confidence: 0.7,
      rationale: "r",
      evidence: ["hackernews:1"],
      rubricVersion: "2026-07-01",
    };
    await persistScoredTrend(trend, [score]);
  });
  afterAll(async () => {
    for (const id of orgIds) await prisma.organization.delete({ where: { id } }).catch(() => {});
    for (const id of userIds) await prisma.user.delete({ where: { id } }).catch(() => {});
    for (const s of trendSlugs) await prisma.trend.delete({ where: { slug: s } }).catch(() => {});
  });

  it("generates a delivered brief with top trends and org counts", async () => {
    const brief = await generateDailyBrief(orgA);
    expect(brief.deliveredAt).toBeTruthy();
    const content = brief.content as unknown as BriefContent;
    expect(content.topTrends.length).toBeGreaterThan(0);
    expect(typeof content.watchlistCount).toBe("number");
    expect(typeof content.unreadAlerts).toBe("number");
    // enriched per-trend fields: score band + (possibly null) top build idea
    const top = content.topTrends[0]!;
    expect(["low", "medium", "high"]).toContain(top.band);
    expect(top).toHaveProperty("topIdea");
  });

  it("lists briefs and tracks opens (idempotent)", async () => {
    const list = await listBriefs(orgA);
    expect(list.length).toBeGreaterThan(0);
    const opened = await markBriefOpened(orgA, list[0]!.id);
    expect(opened.openedAt).toBeTruthy();
    const again = await markBriefOpened(orgA, list[0]!.id); // keeps first open time
    expect(again.openedAt!.getTime()).toBe(opened.openedAt!.getTime());
  });

  it("isolates briefs across orgs", async () => {
    const aBrief = (await listBriefs(orgA))[0]!;
    expect(await listBriefs(orgB)).toHaveLength(0);
    await expect(getBrief(orgB, aBrief.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});
