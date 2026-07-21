---
"@aioi/database": patch
---

Fix duplicate daily briefs. `generateDailyBrief` always created a new row, so every scheduler run plus
every "Generate today's brief" click stacked another identical DAILY brief for the same org/day. It's now
idempotent per UTC day: if today's DAILY brief already exists it's refreshed in place; otherwise created.
The cron and the button both update the single daily brief instead of piling up duplicates.
