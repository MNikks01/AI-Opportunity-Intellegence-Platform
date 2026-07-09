---
"@aioi/database": minor
"@aioi/web": minor
---

API usage history sparkline on /billing. New getApiUsageHistory helper aggregates the existing
per-day ApiKeyUsage rows into a zero-filled 14-day series (summed across the org's keys), rendered
as a small SVG sparkline with the 14-day total beneath the usage meters.
