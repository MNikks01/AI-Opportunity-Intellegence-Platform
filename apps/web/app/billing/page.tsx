import { getPlan, getEntitlements } from "@aioi/database";
import { Badge, Card } from "@aioi/ui";
import { getDevOrg } from "../lib/dev-org";
import { setPlanAction } from "./actions";

export const dynamic = "force-dynamic";

function fmtLimit(n: number): string {
  return n < 0 ? "Unlimited" : String(n);
}

export default async function BillingPage() {
  const { organizationId } = await getDevOrg();
  const [plan, ent] = await Promise.all([getPlan(organizationId), getEntitlements(organizationId)]);
  const target = plan === "PRO" ? "FREE" : "PRO";

  return (
    <main>
      <h1 style={{ fontSize: "1.5rem", margin: "0 0 4px" }}>Billing</h1>
      <p style={{ color: "var(--fg-muted)", margin: "0 0 20px" }}>
        Your plan and entitlements. (Stripe checkout is wired with keys; this uses direct plan
        changes.)
      </p>

      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontWeight: 600 }}>Current plan</span>
          <Badge band={plan === "PRO" ? "high" : "medium"}>{plan}</Badge>
          <form action={setPlanAction} style={{ marginLeft: "auto" }}>
            <input type="hidden" name="plan" value={target} />
            <button
              type="submit"
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid var(--primary)",
                background: target === "PRO" ? "var(--primary)" : "transparent",
                color: target === "PRO" ? "#fff" : "var(--fg)",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {target === "PRO" ? "Upgrade to Pro" : "Downgrade to Free"}
            </button>
          </form>
        </div>

        <ul style={{ margin: "16px 0 0", paddingLeft: 18, color: "var(--fg-muted)" }}>
          <li>Watchlists: {fmtLimit(ent.maxWatchlists)}</li>
          <li>Alerts: {fmtLimit(ent.maxAlerts)}</li>
          <li>Semantic search: {ent.semanticSearch ? "Yes" : "No"}</li>
          <li>Daily brief: {ent.dailyBrief ? "Yes" : "No"}</li>
        </ul>
      </Card>
    </main>
  );
}
