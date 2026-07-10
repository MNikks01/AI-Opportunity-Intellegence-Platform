import type { Metadata } from "next";
import { getReferralStats } from "@aioi/database";
import { Card } from "@aioi/ui";
import { getDevOrg } from "../lib/dev-org";
import { getSiteUrl } from "../lib/site";
import { applyReferralAction } from "./actions";
import { CopyLink } from "./CopyLink";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Refer & earn",
  description: "Share your referral link and track how many teams join through it.",
};

const APPLIED: Record<string, { text: string; ok: boolean }> = {
  ok: { text: "Referral applied — thanks! You're credited to that team.", ok: true },
  invalid: { text: "That code isn't valid. Check it and try again.", ok: false },
  self: { text: "You can't refer yourself.", ok: false },
  already: { text: "You've already applied a referral code.", ok: false },
};

export default async function ReferralsPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; applied?: string }>;
}) {
  const { organizationId } = await getDevOrg();
  const { ref, applied } = await searchParams;
  const stats = await getReferralStats(organizationId);
  const link = `${getSiteUrl()}/referrals?ref=${stats.code}`;
  const notice = applied ? APPLIED[applied] : undefined;

  return (
    <main className="referrals">
      <header className="referrals-head">
        <span className="referrals-eyebrow">Refer &amp; earn</span>
        <h1>Invite teams, grow together</h1>
        <p>
          Share your link with other builders. When a team joins through it, they&rsquo;re credited
          to you — the foundation for referral rewards.
        </p>
      </header>

      {notice && (
        <p className={`referrals-notice${notice.ok ? " is-ok" : ""}`} role="status">
          {notice.text}
        </p>
      )}

      <Card>
        <h2 className="referrals-card-title">Your referral link</h2>
        <CopyLink link={link} code={stats.code} />
        <div className="referrals-stats">
          <div>
            <span className="referrals-stat-num">{stats.referredCount}</span>
            <span className="referrals-stat-label">
              team{stats.referredCount === 1 ? "" : "s"} joined via your link
            </span>
          </div>
        </div>
      </Card>

      {stats.referredByCode ? (
        <p className="referrals-referred">
          You joined via referral code <strong>{stats.referredByCode}</strong>.
        </p>
      ) : (
        <Card>
          <h2 className="referrals-card-title">Were you referred?</h2>
          <p style={{ color: "var(--fg-muted)", fontSize: "0.875rem", margin: "0 0 12px" }}>
            Enter the code a teammate shared with you.
          </p>
          <form action={applyReferralAction} className="referrals-apply">
            <input
              name="code"
              defaultValue={ref ?? ""}
              placeholder="e.g. K3P9QX2M"
              aria-label="Referral code"
              className="team-input"
              maxLength={16}
            />
            <button type="submit" className="watch-btn">
              Apply
            </button>
          </form>
        </Card>
      )}
    </main>
  );
}
