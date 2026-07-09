/**
 * Weekly newsletter send. Builds "this week's top opportunities" and emails every active subscriber via
 * Resend (each with their own unsubscribe link). Best-effort; no-ops without RESEND_API_KEY. Relative
 * imports (repo root has no @aioi dependency).
 *
 * Usage:
 *   DATABASE_URL=… RESEND_API_KEY=re_… NEWSLETTER_FROM="Name <news@yourdomain>" \
 *     NEXT_PUBLIC_SITE_URL=https://… pnpm exec tsx scripts/newsletter.ts
 *   RESEND_DRY=1 … pnpm exec tsx scripts/newsletter.ts   # preview counts, no send
 */
import { listTrendsPage, listActiveSubscribers } from "../packages/database/src/index";
import {
  buildNewsletterHtml,
  buildNewsletterText,
  newsletterSubject,
  sendEmail,
  type NewsletterTrend,
} from "../services/notification-service/src/index";

const SITE = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://ai-opportunity-intellegence-platfor.vercel.app"
).replace(/\/$/, "");
const FROM = process.env.NEWSLETTER_FROM || "AI Opportunity Intelligence <onboarding@resend.dev>";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }
  const apiKey = process.env.RESEND_API_KEY;

  const [subscribers, { trends }] = await Promise.all([
    listActiveSubscribers(),
    listTrendsPage({ sort: "opportunity", pageSize: 8 }),
  ]);
  const nlTrends: NewsletterTrend[] = trends.map((t) => ({
    title: t.title,
    url: `${SITE}/trends/${t.slug}`,
    opportunity: t.scores.find((s) => s.dimension === "opportunity")?.value ?? null,
    topIdea: t.plan?.topIdea ?? null,
  }));
  const subject = newsletterSubject({ trends: nlTrends, unsubscribeUrl: "", siteUrl: SITE });

  if (!apiKey || process.env.RESEND_DRY) {
    console.log(
      `[${apiKey ? "dry run" : "no RESEND_API_KEY"}] ${subscribers.length} subscribers · ` +
        `${nlTrends.length} trends · subject: "${subject}"`,
    );
    if (!apiKey) console.log("Set RESEND_API_KEY (and NEWSLETTER_FROM) to actually send.");
    process.exit(0);
  }

  let sent = 0;
  let failed = 0;
  for (const sub of subscribers) {
    const unsubscribeUrl = `${SITE}/unsubscribe?token=${sub.token}`;
    const input = { trends: nlTrends, unsubscribeUrl, siteUrl: SITE };
    try {
      const r = await sendEmail({
        to: sub.email,
        subject,
        html: buildNewsletterHtml(input),
        text: buildNewsletterText(input),
        from: FROM,
        apiKey,
        unsubscribeUrl,
      });
      if (r.ok) sent += 1;
      else failed += 1;
    } catch {
      failed += 1;
    }
  }
  console.log(`newsletter: sent ${sent}, failed ${failed}, of ${subscribers.length} subscribers.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
