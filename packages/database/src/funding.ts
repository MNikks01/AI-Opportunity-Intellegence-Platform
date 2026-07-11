/**
 * Funding signal (M15-B / ADR-0006). Funding filings (SEC EDGAR Form D — US private rounds) are ingested
 * as ordinary signals from the `sec-edgar` source; here we read them for the Golden Quadrant's demand
 * axis (money in = validated demand) and for the `/funding` surface. US-only in v1.
 */
import { prisma } from "./client";

// The ingestion connector's source key. Duplicated (not imported) to keep @aioi/database from depending
// on the ingestion-service; kept in sync with SEC_EDGAR_SOURCE_KEY.
export const FUNDING_SOURCE_KEY = "sec-edgar";

const TITLE_SUFFIX = / — private funding \(Form D\)$/;

/** Count each trend's funding signals (from the `sec-edgar` source). Keyed by trendId. */
export async function getTrendFundingHits(trendIds: string[]): Promise<Map<string, number>> {
  if (trendIds.length === 0) return new Map();
  const rows = await prisma.trendSignal.findMany({
    where: { trendId: { in: trendIds }, signal: { source: { key: FUNDING_SOURCE_KEY } } },
    select: { trendId: true },
  });
  const hits = new Map<string, number>();
  for (const r of rows) hits.set(r.trendId, (hits.get(r.trendId) ?? 0) + 1);
  return hits;
}

export interface FundingEvent {
  id: string;
  issuer: string;
  filedAt: Date | null;
  url: string | null;
  trends: { slug: string; title: string }[];
}

/** Recent AI funding events (newest first) with the trends each maps to — powers `/funding`. */
export async function listRecentFunding(limit = 100): Promise<FundingEvent[]> {
  const rows = await prisma.signal.findMany({
    where: { source: { key: FUNDING_SOURCE_KEY } },
    orderBy: [{ publishedAt: "desc" }, { fetchedAt: "desc" }],
    take: limit,
    select: {
      id: true,
      title: true,
      url: true,
      publishedAt: true,
      trends: { select: { trend: { select: { slug: true, title: true } } } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    issuer: (r.title ?? "").replace(TITLE_SUFFIX, "").trim() || "Undisclosed issuer",
    filedAt: r.publishedAt,
    url: r.url,
    trends: r.trends.map((te) => ({ slug: te.trend.slug, title: te.trend.title })),
  }));
}
