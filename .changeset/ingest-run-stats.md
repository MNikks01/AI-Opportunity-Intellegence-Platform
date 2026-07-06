---
"@aioi/database": minor
"@aioi/ingestion-service": patch
"@aioi/web": patch
---

Per-source ingestion run tracking: each connector pass now records an IngestionRun (status + new-item
count + timing) via `recordIngestionRun`; `getSourceStats` includes the latest run per source, and the
/sources page shows a "Last run" column. Best-effort — recording never breaks an ingestion pass.
