---
"@aioi/scheduler": minor
"@aioi/database": minor
"@aioi/ingestion-service": patch
---

Scheduler service: `@aioi/scheduler` (BullMQ + cron) with `runIngestionJob` and `runDailyBriefsJob`
(fan out `generateDailyBrief` over active orgs) as pure, testable job functions + a `startScheduler`
worker. Adds `listActiveOrgIds` to `@aioi/database` and `main`/`types` to `@aioi/ingestion-service`.
