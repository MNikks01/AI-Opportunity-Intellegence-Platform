import { listTrendFeed } from "@aioi/database";
import { getSiteUrl } from "../lib/site";

// Regenerate hourly so newly-discovered opportunities enter the feed without a redeploy.
export const revalidate = 3600;

const ESCAPES: Record<string, string> = {
  "<": "&lt;",
  ">": "&gt;",
  "&": "&amp;",
  "'": "&apos;",
  '"': "&quot;",
};
const xml = (s: string) => s.replace(/[<>&'"]/g, (c) => ESCAPES[c] ?? c);

/**
 * Public RSS 2.0 feed of the newest scored opportunities — a distribution channel for feed readers
 * and automation (Zapier/n8n), complementing the API/MCP surfaces. Serves a valid (empty) channel if
 * the database is unreachable rather than 500-ing.
 */
export async function GET(): Promise<Response> {
  const base = getSiteUrl();
  const self = `${base}/feed.xml`;

  let trends: Awaited<ReturnType<typeof listTrendFeed>> = [];
  try {
    trends = await listTrendFeed(30);
  } catch {
    // fall through to an empty channel
  }

  const items = trends
    .map((t) => {
      const link = `${base}/trends/${t.slug}`;
      const parts = [
        t.opportunity !== null ? `Opportunity ${t.opportunity}/100.` : null,
        t.summary,
        t.topIdea ? `Build idea: ${t.topIdea}` : null,
      ].filter(Boolean);
      return `    <item>
      <title>${xml(t.title)}</title>
      <link>${xml(link)}</link>
      <guid isPermaLink="true">${xml(link)}</guid>
      <pubDate>${t.createdAt.toUTCString()}</pubDate>
      <description>${xml(parts.join(" — "))}</description>
    </item>`;
    })
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>AI Opportunity Intelligence — newest opportunities</title>
    <link>${xml(base)}</link>
    <atom:link href="${xml(self)}" rel="self" type="application/rss+xml" />
    <description>The latest scored AI opportunities — what to build before it&apos;s a trend.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(body, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
