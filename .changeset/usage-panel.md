---
"@aioi/database": minor
"@aioi/web": minor
---

Usage-vs-limits panel on /billing. New countWatchlists / countAlerts helpers feed a set of usage
meters (watchlists, alerts, seats, busiest-key API today) that show consumption against the plan's
entitlements, colouring amber at ≥80% and red at the limit. Unlimited entitlements show a running
count with no cap.
