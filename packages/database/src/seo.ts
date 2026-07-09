import { prisma } from "./client";

/** Scored trend slugs (with last-updated) for the sitemap — only trends that have content. */
export function listTrendSlugs(limit = 5000): Promise<{ slug: string; updatedAt: Date }[]> {
  return prisma.trend.findMany({
    where: { scores: { some: {} } },
    select: { slug: true, updatedAt: true },
    orderBy: { lastSignalAt: "desc" },
    take: limit,
  });
}

/** Minimal fields for a trend's page metadata (title + description). */
export function getTrendSeo(
  slug: string,
): Promise<{ title: string; summary: string | null } | null> {
  return prisma.trend.findUnique({ where: { slug }, select: { title: true, summary: true } });
}

/** Fields for a trend's social share (OG) image: title + opportunity + top build idea. */
export async function getTrendOg(
  slug: string,
): Promise<{ title: string; opportunity: number | null; topIdea: string | null } | null> {
  const t = await prisma.trend.findUnique({
    where: { slug },
    select: {
      title: true,
      scores: { where: { dimension: "OPPORTUNITY" }, select: { value: true }, take: 1 },
      actionPlan: { select: { content: true } },
    },
  });
  if (!t) return null;
  const plan = t.actionPlan?.content as { saasIdeas?: string[] } | null;
  return {
    title: t.title,
    opportunity: t.scores[0]?.value ?? null,
    topIdea: plan?.saasIdeas?.[0] ?? null,
  };
}

/** Minimal fields for an entity's page metadata. Returns null on a malformed id. */
export async function getEntitySeo(id: string): Promise<{ name: string; type: string } | null> {
  try {
    return await prisma.entity.findUnique({ where: { id }, select: { name: true, type: true } });
  } catch {
    return null;
  }
}
