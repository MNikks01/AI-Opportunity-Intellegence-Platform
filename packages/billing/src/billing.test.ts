import { describe, expect, it } from "vitest";
import {
  entitlementsFor,
  withinLimit,
  isPlan,
  isPaidPlan,
  PlanLimitError,
  PLANS,
  PLAN_PRICING,
  monthlyEquivalent,
  isBillingInterval,
  planRank,
} from "./index";

describe("entitlements", () => {
  it("FREE is limited; PRO is unlimited", () => {
    expect(entitlementsFor("FREE").maxWatchlists).toBe(5);
    expect(entitlementsFor("FREE").semanticSearch).toBe(false);
    expect(entitlementsFor("PRO").maxWatchlists).toBe(-1);
    expect(entitlementsFor("PRO").semanticSearch).toBe(true);
    expect(entitlementsFor("FREE").apiDailyQuota).toBe(1000);
    expect(entitlementsFor("PRO").apiDailyQuota).toBe(50000);
  });

  it("seats + quota scale up the ladder (FREE → PRO → TEAM → BUSINESS)", () => {
    expect(entitlementsFor("FREE").maxSeats).toBe(1);
    expect(entitlementsFor("PRO").maxSeats).toBe(3);
    expect(entitlementsFor("TEAM").maxSeats).toBe(25);
    expect(entitlementsFor("BUSINESS").maxSeats).toBe(100);
    expect(entitlementsFor("TEAM").apiDailyQuota).toBe(200000);
    expect(entitlementsFor("BUSINESS").apiDailyQuota).toBe(500000);
    // Strictly increasing rank; each paid plan a real paid plan.
    expect(planRank("FREE")).toBeLessThan(planRank("PRO"));
    expect(planRank("PRO")).toBeLessThan(planRank("TEAM"));
    expect(planRank("TEAM")).toBeLessThan(planRank("BUSINESS"));
    expect(isPaidPlan("BUSINESS")).toBe(true);
    expect(PLAN_PRICING.BUSINESS.annual).toBe(PLAN_PRICING.BUSINESS.monthly * 10);
  });

  it("unknown plans fall back to FREE; TEAM is a paid plan", () => {
    expect(entitlementsFor("ENTERPRISE_X")).toEqual(entitlementsFor("FREE"));
    expect(isPlan("PRO")).toBe(true);
    expect(isPlan("TEAM")).toBe(true);
    expect(isPlan("nope")).toBe(false);
    expect(isPaidPlan("TEAM")).toBe(true);
    expect(isPaidPlan("FREE")).toBe(false);
    expect(PLANS).toContain("TEAM");
  });

  it("annual pricing is 10× monthly (two months free)", () => {
    expect(PLAN_PRICING.PRO.annual).toBe(PLAN_PRICING.PRO.monthly * 10);
    expect(PLAN_PRICING.TEAM.annual).toBe(PLAN_PRICING.TEAM.monthly * 10);
    expect(monthlyEquivalent("PRO", "monthly")).toBe(29);
    expect(monthlyEquivalent("PRO", "annual")).toBe(Math.round(290 / 12));
    expect(isBillingInterval("annual")).toBe(true);
    expect(isBillingInterval("weekly")).toBe(false);
  });

  it("withinLimit respects -1 as unlimited", () => {
    expect(withinLimit(5, 4)).toBe(true);
    expect(withinLimit(5, 5)).toBe(false);
    expect(withinLimit(-1, 9999)).toBe(true);
  });

  it("PlanLimitError carries the feature + code", () => {
    const e = new PlanLimitError("watchlists");
    expect(e.code).toBe("PLAN_LIMIT");
    expect(e.feature).toBe("watchlists");
  });
});
