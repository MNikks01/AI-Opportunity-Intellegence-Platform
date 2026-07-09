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

/** Minimal fields for an entity's page metadata. Returns null on a malformed id. */
export async function getEntitySeo(id: string): Promise<{ name: string; type: string } | null> {
  try {
    return await prisma.entity.findUnique({ where: { id }, select: { name: true, type: true } });
  } catch {
    return null;
  }
}
