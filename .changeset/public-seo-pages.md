---
"@aioi/database": minor
"@aioi/web": minor
---

Public SEO pages: a dynamic sitemap.xml (all scored trends + entities + static routes) and robots.txt,
per-page metadata (title template, description, canonical, Open Graph/Twitter) for /trends/[slug] and
/entities/[id], JSON-LD on trend pages, and metadataBase in the root layout. New `listTrendSlugs` /
`getTrendSeo` / `getEntitySeo` + a `getSiteUrl` helper (NEXT_PUBLIC_SITE_URL for the canonical domain).
