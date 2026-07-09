---
"@aioi/billing": minor
"@aioi/web": patch
---

Plan-aware API quota: the daily API rate limit now comes from the org plan's entitlements (Free 1,000/day,
Pro 50,000/day) instead of a constant. New apiDailyQuota entitlement; /team shows the plan + quota.
