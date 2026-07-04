---
name: seo
description: >-
  Deep SEO guidance for the AI Opportunity Intelligence Platform — SSR/ISR, metadata, structured data,
  and a dogfooded content engine (the product's own "suggested keywords/content" powers acquisition).
  Use when building public/marketing/blog/docs pages, topic + trend-teaser landing pages, sitemaps,
  metadata, or anything affecting crawlability, indexation, and Core Web Vitals for organic growth.
---

# SEO & Organic Acquisition

Content/SEO is a **primary acquisition channel** (PRD/Market Research). The product dogfoods itself:
the same "Suggested Keywords/Content/Domains" it generates power our own topic + trend-teaser pages.
SEO surfaces live in the **marketing** and **docs** apps and public trend/entity teasers — server-
rendered (SSR/ISR) for indexability and speed. Authenticated app pages are noindex. See
[IA §SEO](../../../docs/03-design/INFORMATION_ARCHITECTURE.md), [Market Research](../../../docs/00-discovery/MARKET_RESEARCH.md).

## When to apply

- Building public pages: landing, pricing, blog, changelog, topic pages, trend/entity teasers.
- Metadata, Open Graph, structured data (JSON-LD), sitemaps, robots, canonical URLs.
- Anything affecting crawlability, indexation, or Core Web Vitals on public pages.

## Rule categories by priority

| Priority | Category | Why |
|---|---|---|
| **CRITICAL** | Server rendering | Client-only content isn't reliably indexed → no organic traffic. |
| **CRITICAL** | Indexation control | Wrong robots/canonical/noindex tanks or duplicates pages. |
| **HIGH** | Metadata & structured data | Titles/descriptions/JSON-LD drive CTR + rich results. |
| **HIGH** | Core Web Vitals | Speed is a ranking + UX factor (public pages must be fast). |
| **HIGH** | Content quality/uniqueness | Thin/duplicate pages get filtered; dogfood real value. |
| **MEDIUM** | URL & IA | Clean, stable, semantic URLs + internal linking. |
| **MEDIUM** | Sitemaps/feeds | Help discovery of fresh trend/topic pages. |

## Quick reference — the rules

### 1. Server rendering (CRITICAL)
- Public pages are RSC + SSR/ISR (Next App Router). Trend/topic pages use ISR with revalidation so
  fresh content is indexable without per-request cost. Never gate SEO content behind client JS.

### 2. Indexation control (CRITICAL)
- Authenticated app (`app.*`) is `noindex`. Public marketing/docs/teasers are indexable. Exactly one
  **canonical** per page; avoid duplicate topic pages. `robots.txt` + per-route robots meta correct.

### 3. Metadata & structured data (HIGH)
- Unique `<title>` (≤ ~60 chars) + meta description (~150) per page via Next Metadata API. Open Graph +
  Twitter cards for shares. JSON-LD where relevant (Article for blog, BreadcrumbList, Organization,
  FAQ). Trend teasers get a compelling title from the trend + summary.

### 4. Core Web Vitals (HIGH)
- LCP fast (SSR + optimized hero, `next/image`), CLS ~0 (reserve space, no layout shift), INP low
  (minimal client JS). Public pages ship little/no client bundle.

### 5. Content quality (HIGH)
- Pages must offer real, unique value (dogfood the scorecard/keywords), not thin auto-generated stubs.
  Prune/aggregate low-value pages. No cloaking (serve the same content to users + crawlers).

### 6. URLs & IA (MEDIUM)
- Clean, stable, semantic URLs (`/trends/:slug`, `/topics/:topic`, `/blog/:slug`). Internal-link
  related trends/topics. Don't leak tenant/session data into URLs.

### 7. Sitemaps/feeds (MEDIUM)
- Generate `sitemap.xml` (topics, published trend teasers, blog); ping on updates. RSS/Atom for blog.

## Patterns — good vs bad

**Per-page metadata + ISR:**
```tsx
// ✅ GOOD — server metadata, ISR, canonical, JSON-LD
export const revalidate = 3600; // ISR
export async function generateMetadata({ params }): Promise<Metadata> {
  const t = await getTrendTeaser(params.slug);
  return {
    title: `${t.title} — AI opportunity scorecard`,
    description: t.summary?.slice(0, 155),
    alternates: { canonical: `/trends/${t.slug}` },
    openGraph: { title: t.title, description: t.summary, type: "article" },
    robots: { index: true, follow: true },
  };
}
```

```tsx
// ❌ BAD — client-only content (not indexed), no metadata, noindex forgotten
"use client";
export default function Page() { const t = useTrend(); return <h1>{t?.title}</h1>; }
```

**Noindex the app, index the public teaser:**
```ts
// app (authenticated): robots: { index: false }   // ✅ don't index private dashboards
// marketing/teaser: robots: { index: true }       // ✅ index public value
```

## Step-by-step: ship an SEO page

1. Confirm it's public + valuable (dogfood real scorecard/keyword content). Choose SSR vs ISR (ISR for
   trend/topic pages with `revalidate`).
2. Add unique title/description + OG/Twitter + JSON-LD via the Metadata API. Set canonical + robots.
3. Optimize CWV: `next/image`, reserve space (no CLS), minimal client JS.
4. Add to `sitemap.xml`; internal-link related pages.
5. Verify: rendered HTML contains the content (view source / curl), Lighthouse/CWV pass, structured
   data validates. CHANGELOG + changeset.

## Decision guide

| Page type | Render | Index? |
|---|---|---|
| Marketing/landing/pricing | SSR/static | ✅ |
| Blog/docs | SSG/ISR | ✅ |
| Topic / trend teaser (public) | ISR (`revalidate`) | ✅ |
| Full trend detail (in-app) | RSC dynamic | ❌ noindex |
| Dashboards/settings | dynamic | ❌ noindex |

## Failure modes → fixes

| Symptom | Cause | Fix |
|---|---|---|
| Pages not indexed | client-only content / noindex | SSR/ISR; correct robots |
| Duplicate/thin content filtered | many near-identical stubs | canonical; unique value; prune |
| Poor CTR | weak/duplicate titles+descriptions | unique metadata; OG cards |
| Bad CWV | heavy client JS / layout shift | RSC; `next/image`; reserve space |
| Tenant data in URL | session/org in query | keep context server-side |

## Pre-delivery checklist

- [ ] Public page is SSR/ISR; content present in server HTML (verified)
- [ ] Unique title + meta description; OG/Twitter cards; relevant JSON-LD
- [ ] Exactly one canonical; correct robots (app = noindex, public = index)
- [ ] CWV pass (LCP/CLS/INP); `next/image`; minimal client JS
- [ ] Real, unique value (dogfooded); no thin/duplicate/cloaked pages
- [ ] Clean stable URL; internal links; no tenant data in URL
- [ ] Added to sitemap; feed updated (blog); CHANGELOG + changeset

## References
[INFORMATION_ARCHITECTURE](../../../docs/03-design/INFORMATION_ARCHITECTURE.md) · [MARKET_RESEARCH](../../../docs/00-discovery/MARKET_RESEARCH.md) ·
skills: `frontend`, `performance`, `documentation`, `analytics`.
