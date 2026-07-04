---
name: analytics
description: >-
  Deep guidance for product analytics and telemetry in the AI Opportunity Intelligence Platform — a
  typed event schema (@aioi/analytics) feeding activation, retention, and the north-star (Weekly
  Acted-On Opportunities). Use when instrumenting events, defining the tracking plan, wiring funnels/
  dashboards, or reviewing that events are typed, privacy-safe, and tied to real product decisions.
---

# Product Analytics & Telemetry

Instrument to answer product questions, not to hoard data. Events are **typed** (`@aioi/analytics`),
**privacy-safe** (no PII in properties), and map to a **tracking plan** tied to the funnel and the
**north-star: Weekly Acted-On Opportunities** (a user takes a tracked action — save-to-build, export a
plan, set an alert, create an API key — on a scored opportunity). Distinguish product analytics from
system telemetry (OTel/Langfuse — see `performance`/`ai`). See [Vision §metrics](../../../docs/01-product/VISION_AND_MISSION.md),
[PRD §12](../../../docs/01-product/PRODUCT_REQUIREMENTS_DOCUMENT.md).

## When to apply

- Adding/renaming any tracked event, funnel step, or dashboard metric.
- Instrumenting a new feature; defining the tracking plan for it.
- Reviewing that events are typed, consistent, privacy-safe, and decision-linked.

## Rule categories by priority

| Priority | Category | Why |
|---|---|---|
| **CRITICAL** | No PII in events | Analytics pipelines are wide-access; PII leaks are breaches. |
| **CRITICAL** | Typed schema | Ad-hoc events rot into unusable, inconsistent data. |
| **HIGH** | North-star + funnel alignment | Track what changes decisions, not vanity metrics. |
| **HIGH** | Consistent taxonomy | `object_action` naming + shared props enable analysis. |
| **HIGH** | Consent & governance | Respect consent; declare retention; server-side where sensitive. |
| **MEDIUM** | Idempotency & reliability | Don't double-count; don't lose key conversions. |
| **MEDIUM** | Actionable dashboards | Every metric maps to a decision/owner. |

## The metric hierarchy

| Level | Metric | Definition |
|---|---|---|
| North-star | Weekly Acted-On Opportunities | users taking a tracked action on a scored opportunity / week |
| Activation | activated user | set ≥1 watchlist + opened ≥1 brief within 7 days |
| Retention | W4 retention · brief open rate | returns week 4 · opened daily brief |
| Quality (guardrail) | score user-rating · eval pass | trust in scores |
| Monetization | free→paid · NRR | conversion + expansion |

## Quick reference — the rules

### 1. No PII (CRITICAL)
- Event properties never contain emails, names, tokens, secrets, or raw content. Use ids (`orgId`,
  `userId`, `trendId`). Hash where a stable-but-anonymous key is needed. `@aioi/logger` redaction applies.

### 2. Typed schema (CRITICAL)
- Every event is defined once in `@aioi/analytics` with a Zod/TS schema (name + typed props). Emitting
  an undefined event or wrong props is a type error. One `track(event, props)` API.

### 3. North-star/funnel alignment (HIGH)
- Instrument the funnel (signup → onboarding → first scorecard → save/act → subscribe) and the
  north-star action. Prefer fewer, meaningful events over spraying clicks.

### 4. Taxonomy (HIGH)
- Names are `object_action` snake/dot (`trend_viewed`, `watchlist_created`, `opportunity_acted_on`,
  `brief_opened`, `api_key_created`). Shared context props (`orgId`, `plan`, `surface`) on every event.

### 5. Consent & governance (HIGH)
- Honor cookie/consent choices (default to privacy-preserving). Sensitive/critical conversions tracked
  **server-side** (reliable, not ad-blocked). Declare retention; document the tracking plan.

### 6. Idempotency (MEDIUM)
- Key conversions (subscribe, acted-on) deduped (idempotency key / server event) so retries/replays
  don't double-count.

### 7. Actionable dashboards (MEDIUM)
- Each dashboard metric has an owner + a decision it informs. Cohort + funnel views; alert on north-star drops.

## Patterns — good vs bad

**Typed, PII-free, server-side conversion:**
```ts
// ❌ BAD — untyped, PII, client-only for a key conversion
analytics.track("clicked", { email: user.email, trendTitle });   // PII + ad-blockable + unusable

// ✅ GOOD — typed event, ids only, server-side for the north-star action
track("opportunity_acted_on", {
  orgId: ctx.orgId, userId: ctx.userId, trendId, actionType: "saved_to_build", plan: ctx.plan,
});
// @aioi/analytics defines opportunity_acted_on with a Zod schema; wrong props won't compile
```

**Event definition (single source of truth):**
```ts
// ✅ GOOD — @aioi/analytics
export const events = {
  trend_viewed:        z.object({ orgId, userId, trendId, surface: z.enum(["dashboard","search","brief"]) }),
  watchlist_created:   z.object({ orgId, userId, watchlistId }),
  opportunity_acted_on:z.object({ orgId, userId, trendId, actionType: z.enum(["saved_to_build","exported","alerted","api_key"]) }),
  brief_opened:        z.object({ orgId, userId, briefId }),
};
```

## Step-by-step: instrument a feature

1. Define the question ("does X drive activation/acted-on?"). Pick the minimal events.
2. Add typed event definitions to `@aioi/analytics` (names + props, no PII).
3. Emit via `track()` at the right point; use server-side for key conversions; dedupe.
4. Add shared context props; respect consent.
5. Build/extend the funnel/cohort dashboard; tie each metric to a decision + owner.
6. Update the tracking plan doc + CHANGELOG.

## Decision guide

| Situation | Do | Don't |
|---|---|---|
| Key conversion (subscribe/act) | server-side, deduped | client-only (ad-blocked, lost) |
| Identify a record | id (orgId/trendId) | name/email/raw content |
| New event | define typed in `@aioi/analytics` | ad-hoc string |
| Measure success | north-star + funnel | pageviews/clicks vanity |
| Sensitive data | don't send it | "just track it for now" |

## Failure modes → fixes

| Symptom | Cause | Fix |
|---|---|---|
| PII in analytics | properties carry emails/content | ids only; hash; review schema |
| Unusable/inconsistent data | untyped ad-hoc events | typed schema + taxonomy |
| Undercounted conversions | client-only + ad-blockers | server-side key events |
| Double-counted | retries/replays | idempotency key / server dedupe |
| Metric nobody uses | vanity/no owner | tie to a decision + owner; prune |

## Pre-delivery checklist

- [ ] No PII/secrets/raw content in event properties (ids only; hash if needed)
- [ ] Event defined once in `@aioi/analytics` (typed name + props); emit via `track()`
- [ ] Instruments the funnel + north-star (Weekly Acted-On Opportunities)
- [ ] `object_action` naming + shared context props (`orgId`, `plan`, `surface`)
- [ ] Consent honored; key conversions server-side + deduped
- [ ] Dashboard metric has an owner + a decision it informs; north-star alerting
- [ ] Tracking plan doc + CHANGELOG + changeset updated

## References
[VISION_AND_MISSION](../../../docs/01-product/VISION_AND_MISSION.md) · [PRD §12](../../../docs/01-product/PRODUCT_REQUIREMENTS_DOCUMENT.md) ·
skills: `security`, `performance`, `payments`, `seo`, `documentation`.
