import { describe, expect, it } from "vitest";
import { entitlementsFor, withinLimit, isPlan, isPaidPlan, PlanLimitError, PLANS } from "./index";

describe("entitlements", () => {
  it("FREE is limited; PRO is unlimited", () => {
    expect(entitlementsFor("FREE").maxWatchlists).toBe(5);
    expect(entitlementsFor("FREE").semanticSearch).toBe(false);
    expect(entitlementsFor("PRO").maxWatchlists).toBe(-1);
    expect(entitlementsFor("PRO").semanticSearch).toBe(true);
    expect(entitlementsFor("FREE").apiDailyQuota).toBe(1000);
    expect(entitlementsFor("PRO").apiDailyQuota).toBe(50000);
  });

  it("seats scale by plan (FREE 1 → PRO 3 → TEAM 25)", () => {
    expect(entitlementsFor("FREE").maxSeats).toBe(1);
    expect(entitlementsFor("PRO").maxSeats).toBe(3);
    expect(entitlementsFor("TEAM").maxSeats).toBe(25);
    expect(entitlementsFor("TEAM").apiDailyQuota).toBe(200000);
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
