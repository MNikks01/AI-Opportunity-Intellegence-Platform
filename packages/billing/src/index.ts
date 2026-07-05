/**
 * @aioi/billing
 * Plans + entitlements — the Stripe-agnostic core. Stripe (checkout, webhooks) is a thin adapter that
 * ultimately calls `setPlan`; this package owns "what a plan grants" and the enforcement helpers.
 */

export type Plan = "FREE" | "PRO";

export interface Entitlements {
  /** -1 = unlimited. */
  maxWatchlists: number;
  maxAlerts: number;
  semanticSearch: boolean;
  dailyBrief: boolean;
}

export const PLAN_ENTITLEMENTS: Record<Plan, Entitlements> = {
  FREE: { maxWatchlists: 5, maxAlerts: 10, semanticSearch: false, dailyBrief: true },
  PRO: { maxWatchlists: -1, maxAlerts: -1, semanticSearch: true, dailyBrief: true },
};

export const PLANS = Object.keys(PLAN_ENTITLEMENTS) as Plan[];

export function isPlan(value: string): value is Plan {
  return value === "FREE" || value === "PRO";
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
