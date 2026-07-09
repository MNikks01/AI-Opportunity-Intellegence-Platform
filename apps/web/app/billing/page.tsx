import { getPlan, getEntitlements, getSubscription } from "@aioi/database";
import { Badge, Card } from "@aioi/ui";
import { getDevOrg } from "../lib/dev-org";
import { stripeConfigured } from "../lib/billing";
import { startCheckoutAction, openPortalAction, cancelSubscriptionAction } from "./actions";

export const dynamic = "force-dynamic";

function fmtLimit(n: number): string {
  return n < 0 ? "Unlimited" : n.toLocaleString();
}

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
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { organizationId } = await getDevOrg();
  const [plan, ent, sub] = await Promise.all([
    getPlan(organizationId),
    getEntitlements(organizationId),
    getSubscription(organizationId),
  ]);
  const { checkout } = await searchParams;
  const banner = checkout ? BANNERS[checkout] : undefined;
  const isPaid = plan === "PRO" || plan === "TEAM";
  const hasStripeCustomer = Boolean(sub?.stripeCustomerId);
  const live = stripeConfigured();
  const testSuffix = live ? "" : " (test)";

  return (
    <main>
      <h1 style={{ fontSize: "1.5rem", margin: "0 0 4px" }}>Billing</h1>
      <p style={{ color: "var(--fg-muted)", margin: "0 0 20px" }}>
        Your plan and entitlements. Compare tiers on the{" "}
        <a href="/pricing" style={{ color: "var(--primary)" }}>
          pricing page
        </a>
        .
      </p>

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
                <button type="submit" className="billing-btn billing-btn-primary">
                  Upgrade to Pro{testSuffix}
                </button>
              </form>
            )}
            {plan !== "TEAM" && (
              <form action={startCheckoutAction}>
                <input type="hidden" name="plan" value="TEAM" />
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
          <li>Watchlists: {fmtLimit(ent.maxWatchlists)}</li>
          <li>Alerts: {fmtLimit(ent.maxAlerts)}</li>
          <li>Team seats: {fmtLimit(ent.maxSeats)}</li>
          <li>Semantic search: {ent.semanticSearch ? "Yes" : "No"}</li>
          <li>Daily brief: {ent.dailyBrief ? "Yes" : "No"}</li>
          <li>API quota: {fmtLimit(ent.apiDailyQuota)} requests/day per key</li>
        </ul>
      </Card>

      <p style={{ color: "var(--fg-muted)", fontSize: "0.8125rem", margin: "14px 2px 0" }}>
        {live
          ? "Payments are handled by Stripe. Plan changes take effect when Stripe confirms them."
          : "Stripe isn't configured in this environment — upgrades apply directly for testing. Set STRIPE_SECRET_KEY, STRIPE_PRICE_PRO, and STRIPE_WEBHOOK_SECRET to enable real checkout."}
      </p>
    </main>
  );
}
