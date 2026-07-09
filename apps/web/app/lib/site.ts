/**
 * Canonical site origin for SEO (canonical URLs, sitemap, Open Graph). Prefers an explicit
 * NEXT_PUBLIC_SITE_URL (set this to your custom domain in prod), then Vercel's stable production
 * domain, then the per-deploy URL, then localhost for dev.
 */
export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    "http://localhost:3000";
  const url = raw.startsWith("http") ? raw : `https://${raw}`;
  return url.replace(/\/$/, "");
}
