import {
  getPlan,
  getEntitlements,
  getSubscription,
  countWatchlists,
  countAlerts,
  countMembers,
  listApiKeys,
  getApiKeyUsageToday,
  getApiUsageHistory,
} from "@aioi/database";
import { isBillingInterval, type BillingInterval } from "@aioi/billing";
import { Badge, Card } from "@aioi/ui";
import { getDevOrg } from "../lib/dev-org";
import { stripeConfigured } from "../lib/billing";
import { startCheckoutAction, openPortalAction, cancelSubscriptionAction } from "./actions";
import { UsageMeter } from "./UsageMeter";
import { Sparkline } from "./Sparkline";

export const dynamic = "force-dynamic";

const BANNERS: Record<string, { text: string; band: "high" | "medium" }> = {
  success: { text: "Payment received — your plan is now active.", band: "high" },
  stub: { text: "Plan updated (test mode — no Stripe configured).", band: "medium" },
  cancelled: { text: "Checkout cancelled. You're still on your current plan.", band: "medium" },
  cancelling: {
    text: "Cancellation scheduled — you keep your plan until the period ends.",
    band: "medium",
  },
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; interval?: string }>;
}) {
  const { organizationId } = await getDevOrg();
  const [plan, ent, sub, watchlists, alerts, seats, apiKeys] = await Promise.all([
    getPlan(organizationId),
    getEntitlements(organizationId),
    getSubscription(organizationId),
    countWatchlists(organizationId),
    countAlerts(organizationId),
    countMembers(organizationId),
    listApiKeys(organizationId),
  ]);
  const keyIds = apiKeys.map((k) => k.id);
  const [usageToday, history] = await Promise.all([
    apiKeys.length ? getApiKeyUsageToday(keyIds) : new Map<string, number>(),
    getApiUsageHistory(keyIds, 14),
  ]);
  // The quota is per key per day, so the meaningful "closest to the cap" figure is the busiest key.
  const apiPeak = usageToday.size ? Math.max(...usageToday.values()) : 0;
  const history14 = history.reduce((a, d) => a + d.count, 0);
  const { checkout, interval: rawInterval } = await searchParams;
  const interval: BillingInterval =
    rawInterval && isBillingInterval(rawInterval) ? rawInterval : "monthly";
  const banner = checkout ? BANNERS[checkout] : undefined;
  const isPaid = plan === "PRO" || plan === "TEAM";
  const hasStripeCustomer = Boolean(sub?.stripeCustomerId);
  const live = stripeConfigured();
  const testSuffix = live ? "" : " (test)";

  return (
    <main>
      <h1 style={{ fontSize: "1.5rem", margin: "0 0 4px" }}>Billing</h1>
      <p style={{ color: "var(--fg-muted)", margin: "0 0 16px" }}>
        Your plan and entitlements. Compare tiers on the{" "}
        <a href="/pricing" style={{ color: "var(--primary)" }}>
          pricing page
        </a>
        .
      </p>

      {plan !== "TEAM" && (
        <div
          className="pricing-toggle"
          role="group"
          aria-label="Billing interval"
          style={{ margin: "0 0 20px" }}
        >
          <a
            href="/billing?interval=monthly"
            className={interval === "annual" ? "" : "is-active"}
            aria-current={interval !== "annual"}
          >
            Monthly
          </a>
          <a
            href="/billing?interval=annual"
            className={interval === "annual" ? "is-active" : ""}
            aria-current={interval === "annual"}
          >
            Annual <span className="pricing-save">2 months free</span>
          </a>
        </div>
      )}

      {banner && (
        <div
          role="status"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            margin: "0 0 16px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            background: "var(--bg-muted)",
            fontSize: "0.9rem",
          }}
        >
          <Badge band={banner.band}>
            {plan === "FREE" ? "Free" : plan === "TEAM" ? "Team" : "Pro"}
          </Badge>
          {banner.text}
        </div>
      )}

      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600 }}>Current plan</span>
          <Badge band={isPaid ? "high" : "medium"}>{plan}</Badge>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {plan === "FREE" && (
              <form action={startCheckoutAction}>
                <input type="hidden" name="plan" value="PRO" />
                <input type="hidden" name="interval" value={interval} />
                <button type="submit" className="billing-btn billing-btn-primary">
                  Upgrade to Pro{testSuffix}
                </button>
              </form>
            )}
            {plan !== "TEAM" && (
              <form action={startCheckoutAction}>
                <input type="hidden" name="plan" value="TEAM" />
                <input type="hidden" name="interval" value={interval} />
                <button type="submit" className="billing-btn billing-btn-primary">
                  Upgrade to Team{testSuffix}
                </button>
              </form>
            )}
            {isPaid && hasStripeCustomer && live && (
              <form action={openPortalAction}>
                <button type="submit" className="billing-btn">
                  Manage subscription
                </button>
              </form>
            )}
            {isPaid && (
              <form action={cancelSubscriptionAction}>
                <button type="submit" className="billing-btn billing-btn-danger">
                  {live && hasStripeCustomer ? "Cancel" : "Downgrade to Free"}
                </button>
              </form>
            )}
          </div>
        </div>

        <ul style={{ margin: "16px 0 0", paddingLeft: 18, color: "var(--fg-muted)" }}>
          <li>Semantic search: {ent.semanticSearch ? "Yes" : "No"}</li>
          <li>Daily brief: {ent.dailyBrief ? "Yes" : "No"}</li>
        </ul>
      </Card>

      <h2 style={{ fontSize: "1.125rem", margin: "28px 0 4px" }}>Usage</h2>
      <p style={{ color: "var(--fg-muted)", fontSize: "0.8125rem", margin: "0 0 14px" }}>
        What you&rsquo;re using against your plan&rsquo;s limits. API resets daily (UTC).
      </p>
      <Card>
        <div className="usage-grid">
          <UsageMeter label="Watchlists" used={watchlists} limit={ent.maxWatchlists} />
          <UsageMeter label="Alerts" used={alerts} limit={ent.maxAlerts} />
          <UsageMeter label="Team seats" used={seats} limit={ent.maxSeats} />
          <UsageMeter label="API today (busiest key)" used={apiPeak} limit={ent.apiDailyQuota} />
        </div>

        <div className="spark-block">
          <div className="spark-head">
            <span className="usage-label">API requests · last 14 days</span>
            <span className="usage-count">{history14.toLocaleString()} total</span>
          </div>
          <Sparkline
            values={history.map((d) => d.count)}
            title={`API requests per day over the last 14 days — ${history14} total`}
          />
        </div>
      </Card>

      <p style={{ color: "var(--fg-muted)", fontSize: "0.8125rem", margin: "14px 2px 0" }}>
        {live
          ? "Payments are handled by Stripe. Plan changes take effect when Stripe confirms them."
          : "Stripe isn't configured in this environment — upgrades apply directly for testing. Set STRIPE_SECRET_KEY, STRIPE_PRICE_PRO, and STRIPE_WEBHOOK_SECRET to enable real checkout."}
      </p>
    </main>
  );
}
