/**
 * Personalized weekly watchlist digest. For every org, email its members a summary of movement in
 * THAT org's watched trends (opportunity + momentum) and how many new alert matches landed. Distinct
 * from the generic newsletter. Best-effort; no-ops without RESEND_API_KEY. Orgs with no watched trends
 * are skipped (nothing personal to say). Relative imports (repo root has no @aioi dependency).
 *
 * Usage:
 *   DATABASE_URL=… APP_DATABASE_URL=… RESEND_API_KEY=re_… \
 *     NEWSLETTER_FROM="Name <digest@yourdomain>" NEXT_PUBLIC_SITE_URL=https://… \
 *     pnpm exec tsx scripts/weekly-digest.ts
 *   RESEND_DRY=1 … pnpm exec tsx scripts/weekly-digest.ts   # preview counts, no send
 */
import {
  listActiveOrgIds,
  listWatchlists,
  listWatchedTargetIds,
  getTrendsByIds,
  getTrendMomentumMap,
  unreadNotificationCount,
  listOrgMemberEmails,
} from "../packages/database/src/index";
import {
  watchlistDigestSubject,
  buildWatchlistDigestHtml,
  buildWatchlistDigestText,
  sendEmail,
  type DigestTrendItem,
  type MomentumLabel,
} from "../services/notification-service/src/index";

const SITE = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://ai-opportunity-intellegence-platfor.vercel.app"
).replace(/\/$/, "");
const FROM = process.env.NEWSLETTER_FROM || "AI Opportunity Intelligence <onboarding@resend.dev>";
const MAX_TRENDS = 10;

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }
  const apiKey = process.env.RESEND_API_KEY;
  const dry = Boolean(process.env.RESEND_DRY) || !apiKey;
  const manageUrl = `${SITE}/notifications`;

  const orgIds = await listActiveOrgIds();
  let withTrends = 0;
  let sent = 0;

  for (const orgId of orgIds) {
    // Collect this org's watched trend ids across all its watchlists.
    const watchlists = await listWatchlists(orgId);
    const ids = new Set<string>();
    for (const wl of watchlists) {
      for (const id of await listWatchedTargetIds(orgId, wl.id, "TREND")) ids.add(id);
    }
    if (ids.size === 0) continue; // nothing personal to send
    withTrends += 1;

    const [trendMap, momentum, newMatches, emails] = await Promise.all([
      getTrendsByIds([...ids]),
      getTrendMomentumMap([...ids]),
      unreadNotificationCount(orgId),
      listOrgMemberEmails(orgId),
    ]);

    const trends: DigestTrendItem[] = [...trendMap.entries()]
      .map(([id, t]) => ({
        title: t.title,
        url: `${SITE}/trends/${t.slug}`,
        opportunity: t.opportunity,
        momentum: (momentum.get(id)?.state as MomentumLabel | undefined) ?? null,
      }))
      .sort((a, b) => (b.opportunity ?? 0) - (a.opportunity ?? 0))
      .slice(0, MAX_TRENDS);

    const input = { trends, newMatches, siteUrl: SITE, manageUrl };
    if (dry || emails.length === 0) continue;

    const res = await sendEmail({
      to: emails.join(", "),
      subject: watchlistDigestSubject({ trends }),
      html: buildWatchlistDigestHtml(input),
      text: buildWatchlistDigestText(input),
      from: FROM,
      apiKey: apiKey!,
      unsubscribeUrl: manageUrl,
    });
    if (res.ok) sent += 1;
    else console.warn(`send failed (org ${orgId}): HTTP ${res.status}`);
  }

  if (dry) {
    console.log(
      `[dry run] ${withTrends} of ${orgIds.length} org(s) have watched trends; would send ${withTrends} digest(s). Set RESEND_API_KEY (and unset RESEND_DRY) to send.`,
    );
  } else {
    console.log(`Sent ${sent} personalized digest(s) across ${orgIds.length} org(s).`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
