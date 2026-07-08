---
"@aioi/database": minor
"@aioi/ui": minor
"@aioi/web": minor
---

Trend momentum: append-only TrendSnapshot history (one point per pipeline run) → a signal-count
velocity + 7-day delta shown as a sparkline on trend cards and a momentum panel on the detail page.
New `recordTrendSnapshots` (wired into the cron) + `getTrendMomentumMap`; `Sparkline`/`MomentumTag` UI.
