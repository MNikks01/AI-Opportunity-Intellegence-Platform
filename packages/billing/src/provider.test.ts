import { describe, expect, it } from "vitest";
import { StubBillingProvider, planForStripeSubscription } from "./index";

describe("StubBillingProvider", () => {
  it("returns a placeholder checkout URL carrying the intent", async () => {
    const { url } = await new StubBillingProvider().createCheckoutSession({
      orgId: "org1",
      plan: "PRO",
      successUrl: "https://app.test/billing",
      cancelUrl: "https://app.test/billing",
    });
    expect(url).toContain("stub_checkout=1");
    expect(url).toContain("plan=PRO");
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
