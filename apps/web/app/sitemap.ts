import type { MetadataRoute } from "next";
import { listTrendSlugs, listEntities } from "@aioi/database";
import { getSiteUrl } from "./lib/site";

// Regenerate hourly (ISR) so new trends/entities enter the sitemap without a redeploy.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/trends`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/quadrant`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/report`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/entities`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/start`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/changelog`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
  ];

  try {
    const [trends, entities] = await Promise.all([
      listTrendSlugs(5000),
      listEntities({ limit: 2000 }),
    ]);
    const trendRoutes: MetadataRoute.Sitemap = trends.map((t) => ({
      url: `${base}/trends/${t.slug}`,
      lastModified: t.updatedAt,
      changeFrequency: "weekly",
      priority: 0.6,
    }));
    const entityRoutes: MetadataRoute.Sitemap = entities.map((e) => ({
      url: `${base}/entities/${e.id}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    }));
    return [...staticRoutes, ...trendRoutes, ...entityRoutes];
  } catch {
    // If the DB is unreachable, still serve the static routes rather than 500 the sitemap.
    return staticRoutes;
  }
}
