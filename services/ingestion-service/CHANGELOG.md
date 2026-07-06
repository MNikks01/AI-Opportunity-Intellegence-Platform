# @aioi/ingestion-service

## 0.1.5

### Patch Changes

- Updated dependencies [da375de]
- Updated dependencies [bc95bde]
  - @aioi/database@0.9.0

## 0.1.4

### Patch Changes

- Updated dependencies [0d328db]
  - @aioi/database@0.8.0

## 0.1.3

### Patch Changes

- Updated dependencies [2995824]
  - @aioi/database@0.7.0

## 0.1.2

### Patch Changes

- dd23ccb: Scheduler service: `@aioi/scheduler` (BullMQ + cron) with `runIngestionJob` and `runDailyBriefsJob`
  (fan out `generateDailyBrief` over active orgs) as pure, testable job functions + a `startScheduler`
  worker. Adds `listActiveOrgIds` to `@aioi/database` and `main`/`types` to `@aioi/ingestion-service`.
- Updated dependencies [5488c28]
- Updated dependencies [dd23ccb]
  - @aioi/database@0.6.0

## 0.1.1

### Patch Changes

- Updated dependencies [c10faf2]
- Updated dependencies [4e6f14d]
  - @aioi/ai-sdk@0.2.0
  - @aioi/database@0.5.0
  - @aioi/validation@0.2.0

## 0.1.0

### Minor Changes

- a46e4ef: Prisma-backed `SignalRepository` (B-024): persists connector output to `Signal` with idempotent
  `createMany({ skipDuplicates })` dedupe, ensuring the `Source` first. `createSignalRepository()` selects
  Prisma when a DB is configured; `runHackerNewsIngestion` defaults to it.

### Patch Changes

- Updated dependencies [5762d93]
- Updated dependencies [486c37f]
- Updated dependencies [e7d23d8]
- Updated dependencies [c01468e]
  - @aioi/database@0.4.0
  - @aioi/ai-sdk@0.1.0

## 0.0.3

### Patch Changes

- Updated dependencies [5d583c8]
- Updated dependencies [0634493]
  - @aioi/database@0.3.0
  - @aioi/validation@0.1.0
  - @aioi/ai-sdk@0.0.1

## 0.0.2

### Patch Changes

- Updated dependencies [c2a8c88]
- Updated dependencies [8a43b68]
  - @aioi/database@0.2.0

## 0.0.1

### Patch Changes

- Updated dependencies [1bc6a1b]
  - @aioi/database@0.1.0
