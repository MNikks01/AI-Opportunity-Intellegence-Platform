---
"@aioi/database": minor
"@aioi/web": minor
---

Source observability on /sources. The page now shows the full connector catalog with a data-driven
status per source — Live (count), Failing (with the connector's actual error), Idle, or Not set up.
Failed ingestion passes are now recorded (new recordFailedIngestionRun + error surfaced via
getLatestRuns), so a configured-but-broken source (e.g. an expired token) shows why it produced
nothing instead of silently reading zero. Also fixes a merge-introduced unbalanced brace in
globals.css that had broken all CSS after the referrals block.
