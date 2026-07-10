/**
 * Alert email delivery. For every org, find undelivered notifications whose alert uses the EMAIL
 * channel, email them to the org's members via Resend, and mark them delivered. Best-effort; no-ops
 * without RESEND_API_KEY. Relative imports (repo root has no @aioi dependency).
 *
 * Usage:
 *   DATABASE_URL=… APP_DATABASE_URL=… RESEND_API_KEY=re_… \
 *     NEWSLETTER_FROM="Name <alerts@yourdomain>" NEXT_PUBLIC_SITE_URL=https://… \
 *     pnpm exec tsx scripts/deliver-alerts.ts
 *   RESEND_DRY=1 … pnpm exec tsx scripts/deliver-alerts.ts   # preview counts, no send
 */
import {
  listActiveOrgIds,
  listOrgMemberEmails,
  listPendingEmailNotifications,
  markNotificationsEmailed,
  getTrendsByIds,
} from "../packages/database/src/index";
import {
  alertEmailSubject,
  buildAlertEmailHtml,
  buildAlertEmailText,
  sendEmail,
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
  const dry = Boolean(process.env.RESEND_DRY) || !apiKey;
  const manageUrl = `${SITE}/notifications`;

  const orgIds = await listActiveOrgIds();
  let pending = 0;
  let sent = 0;
  let deliveredNotifications = 0;

  for (const orgId of orgIds) {
    const notifs = await listPendingEmailNotifications(orgId, 100);
    if (notifs.length === 0) continue;
    pending += notifs.length;

    const emails = await listOrgMemberEmails(orgId);
    if (emails.length === 0) {
      // No recipients — mark delivered so we don't scan them forever.
      if (!dry)
        await markNotificationsEmailed(
          orgId,
          notifs.map((n) => n.id),
        );
      continue;
    }

    // Resolve trend slugs so emails deep-link to the opportunity (fallback: the in-app inbox).
    const trendIds = notifs
      .filter((n) => n.targetType === "TREND" && n.targetId)
      .map((n) => n.targetId!);
    const trends = await getTrendsByIds([...new Set(trendIds)]);

    const delivered: string[] = [];
    for (const n of notifs) {
      const slug =
        n.targetType === "TREND" && n.targetId ? trends.get(n.targetId)?.slug : undefined;
      const url = slug ? `${SITE}/trends/${slug}` : manageUrl;
      const input = {
        title: n.title,
        body: n.body,
        url,
        siteUrl: SITE,
        unsubscribeUrl: manageUrl,
      };

      if (dry) {
        delivered.push(n.id);
        continue;
      }
      const res = await sendEmail({
        to: emails.join(", "),
        subject: alertEmailSubject({ title: n.title }),
        html: buildAlertEmailHtml(input),
        text: buildAlertEmailText(input),
        from: FROM,
        apiKey: apiKey!,
        unsubscribeUrl: manageUrl,
      });
      if (res.ok) {
        sent += 1;
        delivered.push(n.id);
      } else {
        console.warn(`send failed (org ${orgId}, notification ${n.id}): HTTP ${res.status}`);
      }
    }

    if (delivered.length && !dry) {
      const { updated } = await markNotificationsEmailed(orgId, delivered);
      deliveredNotifications += updated;
    } else if (dry) {
      deliveredNotifications += delivered.length;
    }
  }

  if (dry) {
    console.log(
      `[dry run] ${pending} pending email notification(s) across ${orgIds.length} org(s); ` +
        `would deliver ${deliveredNotifications}. Set RESEND_API_KEY (and unset RESEND_DRY) to send.`,
    );
  } else {
    console.log(
      `Delivered ${deliveredNotifications} notification(s) via ${sent} email(s) across ${orgIds.length} org(s).`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
