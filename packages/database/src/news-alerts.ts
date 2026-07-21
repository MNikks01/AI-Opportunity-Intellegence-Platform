/**
 * News alerts (AI/tech vertical, M8). A user subscribes to a region, category, or model by adding a
 * `TOPIC` watchlist item whose id follows a small convention (`region:US`, `category:ai-models`,
 * `model:llama`). When an analyzed signal matches one of those topics, we write an in-app Notification
 * for every subscribing org. Cross-tenant discovery uses the `app_orgs_watching_topic` SECURITY DEFINER
 * function (WatchlistItem is RLS-protected); per-org writes stay RLS-scoped via `withOrgContext`.
 */
import { prisma } from "./client";
import { withOrgContext } from "./rls";

export interface NewsSignalMatch {
  signalId: string;
  title: string | null;
  region: string;
  categoryKeys: string[];
  /** Names of MODEL entities linked to the signal (optional). */
  modelNames?: string[];
}

/** Build the TOPIC target strings a signal matches. Pure — the subscription id convention lives here. */
export function newsTopicTargets(match: NewsSignalMatch): string[] {
  const topics = new Set<string>();
  topics.add(`region:${match.region}`);
  for (const c of match.categoryKeys) topics.add(`category:${c}`);
  for (const m of match.modelNames ?? []) topics.add(`model:${m.toLowerCase()}`);
  return [...topics];
}

/** Convenience for the subscription UI/API: the topic id for a given target. */
export function regionTopic(region: string): string {
  return `region:${region}`;
}
export function categoryTopic(categoryKey: string): string {
  return `category:${categoryKey}`;
}
export function modelTopic(modelName: string): string {
  return `model:${modelName.toLowerCase()}`;
}

/**
 * Within one org (RLS-scoped): if the org watches any of the signal's topics, write a single Notification.
 * Idempotent per (org, signal): a second run with the same signal won't duplicate. Returns created count.
 */
export function evaluateSignalForOrg(orgId: string, match: NewsSignalMatch): Promise<number> {
  const topics = newsTopicTargets(match);
  return withOrgContext(orgId, async (tx) => {
    const watched = await tx.watchlistItem.findFirst({
      where: { targetType: "TOPIC", targetId: { in: topics } },
      select: { targetId: true },
    });
    if (!watched) return 0;

    // Dedupe: one topic notification per signal per org.
    const existing = await tx.notification.findFirst({
      where: {
        targetType: "TOPIC",
        targetId: watched.targetId,
        body: { contains: match.signalId },
      },
      select: { id: true },
    });
    if (existing) return 0;

    await tx.notification.create({
      data: {
        organizationId: orgId,
        title: `New in ${watched.targetId}`,
        body: `${match.title ?? "A story"} matched your subscription. (signal ${match.signalId})`,
        targetType: "TOPIC",
        targetId: watched.targetId,
      },
    });
    return 1;
  });
}

/**
 * Fan-out entry point for the analysis pipeline: notify every org subscribed to any of the signal's
 * topics. Discovers orgs cross-tenant via `app_orgs_watching_topic`, then writes per-org (RLS-scoped).
 */
export async function evaluateSignalAllOrgs(
  match: NewsSignalMatch,
): Promise<{ orgs: number; notifications: number }> {
  const topics = newsTopicTargets(match);
  const orgIds = new Set<string>();
  for (const topic of topics) {
    const rows = await prisma.$queryRaw<Array<{ org: string }>>`
      SELECT app_orgs_watching_topic(${topic}) AS org`;
    for (const { org } of rows) orgIds.add(org);
  }
  let notifications = 0;
  for (const org of orgIds) {
    notifications += await evaluateSignalForOrg(org, match);
  }
  return { orgs: orgIds.size, notifications };
}
