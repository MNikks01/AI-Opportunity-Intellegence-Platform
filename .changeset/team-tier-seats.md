---
"@aioi/billing": minor
"@aioi/database": minor
"@aioi/web": minor
---

Team tier + seat enforcement. New TEAM plan (25 seats, 200k/day API) alongside Free/Pro; every plan
now has a maxSeats entitlement (Free 1, Pro 3, Team 25) enforced at inviteMember (throws
PlanLimitError). Stripe checkout is plan-aware (Pro/Team prices; plan carried in metadata so the
webhook needs no price→plan table). Pricing page shows 3 tiers; billing offers per-plan upgrades;
the team page shows seat usage and blocks invites when full.
