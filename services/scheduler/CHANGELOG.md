# @aioi/scheduler

## 0.3.0

### Minor Changes

- bc95bde: Signal → Trend clustering (B-006): `clusterSignals` (embed + greedy cosine, deterministic offline via
  the StubEmbedder) + `clusterRecentSignals` orchestration, `listUnclusteredSignals`/
  `createTrendFromSignalIds` in `@aioi/database`, and an hourly scheduler clustering job. Connects
  ingestion → trends.

### Patch Changes

- Updated dependencies [c4ac5c2]
- Updated dependencies [da375de]
- Updated dependencies [bc95bde]
  - @aioi/ai-service@0.2.0
  - @aioi/database@0.9.0
  - @aioi/ingestion-service@0.1.5

## 0.2.0

### Minor Changes

- 0d328db: Email delivery: new `@aioi/email` (EmailProvider seam — Stub outbox + Resend — plus brief/alert
  templates). The scheduler's daily-brief job now emails each org's members (`listOrgMemberEmails`), via
  the Stub outbox offline and Resend when `RESEND_API_KEY`+`EMAIL_FROM` are set.

### Patch Changes

- Updated dependencies [0d328db]
  - @aioi/email@0.1.0
  - @aioi/database@0.8.0
  - @aioi/ingestion-service@0.1.4

## 0.1.1

### Patch Changes

- Updated dependencies [2995824]
  - @aioi/database@0.7.0
  - @aioi/ingestion-service@0.1.3

## 0.1.0

### Minor Changes

- dd23ccb: Scheduler service: `@aioi/scheduler` (BullMQ + cron) with `runIngestionJob` and `runDailyBriefsJob`
  (fan out `generateDailyBrief` over active orgs) as pure, testable job functions + a `startScheduler`
  worker. Adds `listActiveOrgIds` to `@aioi/database` and `main`/`types` to `@aioi/ingestion-service`.

### Patch Changes

- Updated dependencies [5488c28]
- Updated dependencies [dd23ccb]
  - @aioi/database@0.6.0
  - @aioi/ingestion-service@0.1.2

## 0.0.2

### Patch Changes

- Updated dependencies [c10faf2]
  - @aioi/validation@0.2.0

## 0.0.1

### Patch Changes

- Updated dependencies [5d583c8]
- Updated dependencies [0634493]
  - @aioi/validation@0.1.0
