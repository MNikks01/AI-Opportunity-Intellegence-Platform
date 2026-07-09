import { describe, expect, it } from "vitest";
import {
  StubBillingProvider,
  planForStripeSubscription,
  syncFromCheckoutSession,
  syncFromSubscription,
} from "./index";

describe("StubBillingProvider", () => {
  it("returns a placeholder checkout URL carrying the intent", async () => {
    const { url } = await new StubBillingProvider().createCheckoutSession({
      orgId: "org1",
      plan: "PRO",
      interval: "annual",
      successUrl: "https://app.test/billing",
      cancelUrl: "https://app.test/billing",
    });
    expect(url).toContain("stub_checkout=1");
    expect(url).toContain("plan=PRO");
    expect(url).toContain("interval=annual");
    expect(url).toContain("org=org1");
  });
});

describe("planForStripeSubscription", () => {
  it("maps active subscriptions to PRO and cancellations to FREE", () => {
    expect(planForStripeSubscription("customer.subscription.updated", "active")).toBe("PRO");
    expect(planForStripeSubscription("customer.subscription.updated", "trialing")).toBe("PRO");
    expect(planForStripeSubscription("customer.subscription.deleted")).toBe("FREE");
    expect(planForStripeSubscription("customer.subscription.updated", "canceled")).toBe("FREE");
  });
});

describe("syncFromCheckoutSession", () => {
  it("attributes a completed checkout to the org and upgrades to PRO", () => {
    const sync = syncFromCheckoutSession({
      client_reference_id: "org-42",
      customer: "cus_1",
      subscription: "sub_1",
    });
    expect(sync).toMatchObject({
      orgId: "org-42",
      plan: "PRO",
      status: "active",
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
    });
  });

  it("falls back to metadata.orgId, and returns null when the org can't be attributed", () => {
    expect(syncFromCheckoutSession({ metadata: { orgId: "org-9" } })?.orgId).toBe("org-9");
    expect(syncFromCheckoutSession({ customer: "cus_x" })).toBeNull();
  });

  it("reads the plan from metadata (TEAM) and defaults to PRO when absent/invalid", () => {
    expect(
      syncFromCheckoutSession({ client_reference_id: "o", metadata: { plan: "TEAM" } })?.plan,
    ).toBe("TEAM");
    expect(
      syncFromCheckoutSession({ client_reference_id: "o", metadata: { plan: "FREE" } })?.plan,
    ).toBe("PRO");
    expect(syncFromCheckoutSession({ client_reference_id: "o" })?.plan).toBe("PRO");
  });
});

describe("syncFromSubscription", () => {
  it("re-derives the plan from status and maps the period end to a Date", () => {
    const sync = syncFromSubscription("customer.subscription.updated", {
      id: "sub_1",
      status: "active",
      customer: "cus_1",
      current_period_end: 1_700_000_000,
      metadata: { orgId: "org-7" },
    });
    expect(sync).toMatchObject({ orgId: "org-7", plan: "PRO", stripeSubscriptionId: "sub_1" });
    expect(sync?.currentPeriodEnd).toEqual(new Date(1_700_000_000 * 1000));
  });

  it("downgrades on deletion and ignores events without an org", () => {
    expect(
      syncFromSubscription("customer.subscription.deleted", { metadata: { orgId: "o" } })?.plan,
    ).toBe("FREE");
    expect(syncFromSubscription("customer.subscription.updated", { status: "active" })).toBeNull();
  });

  it("carries the TEAM plan from subscription metadata on an active update", () => {
    expect(
      syncFromSubscription("customer.subscription.updated", {
        status: "active",
        metadata: { orgId: "o", plan: "TEAM" },
      })?.plan,
    ).toBe("TEAM");
  });
});
