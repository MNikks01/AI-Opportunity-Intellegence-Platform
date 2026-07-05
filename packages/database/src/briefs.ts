/**
 * Daily Brief (B-018): a per-org digest of the top opportunities + the org's watchlist/alert activity.
 * Generation is aggregation (no LLM) so it's deterministic + testable. Org-scoped writes/reads go
 * through `withOrgContext` (Brief has direct-org RLS); the top-trends query is over global tables.
 */
import type { Prisma } from "@prisma/client";
import { withOrgContext } from "./rls";
import { NotFoundError } from "./watchlists";
import { prisma } from "./client";

export interface BriefTrend {
  slug: string;
  title: string;
  opportunity: number;
}

export interface BriefContent {
  generatedAt: string;
  headline: string;
  topTrends: BriefTrend[];
  watchlistCount: number;
  unreadAlerts: number;
}

/** Highest-opportunity trends (global). MAX collapses rubric versions to one row per trend. */
async function topOpportunityTrends(limit: number): Promise<BriefTrend[]> {
  const rows = await prisma.$queryRaw<Array<{ slug: string; title: string; opportunity: number }>>`
    SELECT t.slug, t.title, MAX(s.value) AS opportunity
    FROM "Trend" t
    JOIN "Score" s ON s."trendId" = t.id AND s.dimension = 'OPPORTUNITY'
    GROUP BY t.slug, t.title
    ORDER BY opportunity DESC
    LIMIT ${limit}`;
  return rows.map((r) => ({ slug: r.slug, title: r.title, opportunity: Number(r.opportunity) }));
}

export async function generateDailyBrief(orgId: string, userId?: string) {
  const topTrends = await topOpportunityTrends(5);
  return withOrgContext(orgId, async (tx) => {
    const watchlistCount = await tx.watchlist.count();
    const unreadAlerts = await tx.notification.count({ where: { readAt: null } });
    const content: BriefContent = {
      generatedAt: new Date().toISOString(),
      headline: topTrends.length
        ? `Today's top opportunity: ${topTrends[0]!.title}`
        : "No scored trends yet",
      topTrends,
      watchlistCount,
      unreadAlerts,
    };
    return tx.brief.create({
      data: {
        organizationId: orgId,
        userId: userId ?? null,
        kind: "DAILY",
        content: content as unknown as Prisma.InputJsonValue,
        deliveredAt: new Date(), // in-app delivery is immediate; email delivery is a follow-up
      },
    });
  });
}

export function listBriefs(orgId: string, limit = 30) {
  return withOrgContext(orgId, (tx) =>
    tx.brief.findMany({ orderBy: { createdAt: "desc" }, take: limit }),
  );
}

export function getBrief(orgId: string, id: string) {
  return withOrgContext(orgId, async (tx) => {
    const brief = await tx.brief.findFirst({ where: { id } });
    if (!brief) throw new NotFoundError("brief");
    return brief;
  });
}

/** Mark a brief opened (open tracking). Idempotent — keeps the first open time. */
export function markBriefOpened(orgId: string, id: string) {
  return withOrgContext(orgId, async (tx) => {
    const brief = await tx.brief.findFirst({ where: { id } });
    if (!brief) throw new NotFoundError("brief");
    if (brief.openedAt) return brief;
    return tx.brief.update({ where: { id }, data: { openedAt: new Date() } });
  });
}
