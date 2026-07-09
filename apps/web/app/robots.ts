import type { MetadataRoute } from "next";
import { getSiteUrl } from "./lib/site";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Personal / tenant surfaces — not useful (or appropriate) to index.
      disallow: ["/watchlists", "/notifications", "/billing", "/briefs", "/admin", "/api"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
