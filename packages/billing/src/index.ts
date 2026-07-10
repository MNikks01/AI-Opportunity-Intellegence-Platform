/**
 * @aioi/billing
 * Plans + entitlements — the Stripe-agnostic core. Stripe (checkout, webhooks) is a thin adapter that
 * ultimately calls `setPlan`; this package owns "what a plan grants" and the enforcement helpers.
 */

export type Plan = "FREE" | "PRO" | "TEAM" | "BUSINESS";

/** Paid plans a customer can check out into (everything but FREE). */
export type PaidPlan = Exclude<Plan, "FREE">;

/** Plan ordering (low → high) — used to decide which upgrades to offer. */
export const PLAN_ORDER: Plan[] = ["FREE", "PRO", "TEAM", "BUSINESS"];

/** Rank of a plan in the ladder (unknown → 0/FREE). Higher = more entitlements. */
export function planRank(plan: string): number {
  const i = PLAN_ORDER.indexOf(plan as Plan);
  return i < 0 ? 0 : i;
}

/** Billing cadence. Annual is priced at 10× the monthly rate (two months free). */
export type BillingInterval = "monthly" | "annual";

export function isBillingInterval(value: string): value is BillingInterval {
  return value === "monthly" || value === "annual";
}

/** Display prices in USD. `annual` is the total charged per year; entitlements don't change by interval. */
export const PLAN_PRICING: Record<PaidPlan, { monthly: number; annual: number }> = {
  PRO: { monthly: 29, annual: 290 },
  TEAM: { monthly: 99, annual: 990 },
  BUSINESS: { monthly: 299, annual: 2990 },
};

/** Effective USD/month for an interval (annual total ÷ 12), rounded. */
export function monthlyEquivalent(plan: PaidPlan, interval: BillingInterval): number {
  const p = PLAN_PRICING[plan];
  return interval === "annual" ? Math.round(p.annual / 12) : p.monthly;
}

export interface Entitlements {
  /** -1 = unlimited. */
  maxWatchlists: number;
  maxAlerts: number;
  /** Team members (including pending invites) allowed on the org. */
  maxSeats: number;
  semanticSearch: boolean;
  dailyBrief: boolean;
  /** Public-API requests per day per key. */
  apiDailyQuota: number;
}

export const PLAN_ENTITLEMENTS: Record<Plan, Entitlements> = {
  FREE: {
    maxWatchlists: 5,
    maxAlerts: 10,
    maxSeats: 1,
    semanticSearch: false,
    dailyBrief: true,
    apiDailyQuota: 1000,
  },
  PRO: {
    maxWatchlists: -1,
    maxAlerts: -1,
    maxSeats: 3,
    semanticSearch: true,
    dailyBrief: true,
    apiDailyQuota: 50000,
  },
  TEAM: {
    maxWatchlists: -1,
    maxAlerts: -1,
    maxSeats: 25,
    semanticSearch: true,
    dailyBrief: true,
    apiDailyQuota: 200000,
  },
  BUSINESS: {
    maxWatchlists: -1,
    maxAlerts: -1,
    maxSeats: 100,
    semanticSearch: true,
    dailyBrief: true,
    apiDailyQuota: 500000,
  },
};

export const PLANS = Object.keys(PLAN_ENTITLEMENTS) as Plan[];

export function isPlan(value: string): value is Plan {
  return value === "FREE" || value === "PRO" || value === "TEAM" || value === "BUSINESS";
}

/** True for a real paid plan (not FREE and not garbage). */
export function isPaidPlan(value: string): value is PaidPlan {
  return value === "PRO" || value === "TEAM" || value === "BUSINESS";
}

/** Entitlements for a plan string; unknown/absent plans fall back to FREE. */
export function entitlementsFor(plan: string): Entitlements {
  return isPlan(plan) ? PLAN_ENTITLEMENTS[plan] : PLAN_ENTITLEMENTS.FREE;
}

/** True if adding one more is allowed given a limit (-1 = unlimited) and the current count. */
export function withinLimit(limit: number, current: number): boolean {
  return limit < 0 || current < limit;
}

/** Thrown when an action would exceed the plan's entitlement. Map to 402/FORBIDDEN at the edge. */
export class PlanLimitError extends Error {
  readonly code = "PLAN_LIMIT" as const;
  constructor(public readonly feature: string) {
    super(`Plan limit reached: ${feature}. Upgrade to continue.`);
    this.name = "PlanLimitError";
  }
}

export {
  StubBillingProvider,
  planForStripeSubscription,
  syncFromCheckoutSession,
  syncFromSubscription,
  type BillingProvider,
  type CheckoutSession,
  type CheckoutInput,
  type PlanSync,
  type StripeCheckoutSessionLike,
  type StripeSubscriptionLike,
} from "./provider";
