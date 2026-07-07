# @aioi/ingestion-service

## 0.3.3

### Patch Changes

- Updated dependencies [919cf06]
  - @aioi/database@0.11.1

## 0.3.2

### Patch Changes

- Updated dependencies [773471d]
  - @aioi/database@0.11.0

## 0.3.1

### Patch Changes

- Updated dependencies [6ae6fa5]
  - @aioi/ai-sdk@0.4.0
  - @aioi/database@0.10.1

## 0.3.0

### Minor Changes

- 7106e88: GitHub ingestion connector (official REST Search API): surfaces emerging AI repos (query + recency,
  ranked by stars), normalizes to SourceRecords, dedupes via the shared SignalRepository. Works
  unauthenticated; GITHUB_TOKEN raises the rate limit; GITHUB_QUERY tunes the search. Scheduled hourly.
  Legality: OFFICIAL (public repos, required User-Agent, rate-limit aware).
- a2ad9c5: Hugging Face ingestion connector (official Hub API): ingests top models (by HF_SORT, default likes),
  normalizes to SourceRecords, dedupes via the shared SignalRepository. Works unauthenticated;
  HUGGINGFACE_TOKEN raises the rate limit. Scheduled hourly. Legality: OFFICIAL (public models only).
- 1894852: Product Hunt (GraphQL v2) and YouTube (Data API v3) ingestion connectors: normalize launches/videos to
  SourceRecords, dedupe via the shared SignalRepository, scheduled hourly. Both no-op without their key
  (PRODUCTHUNT_TOKEN / YOUTUBE_API_KEY) so CI stays green. Legality: OFFICIAL (public metadata only).
  This completes the six planned data sources.

### Patch Changes

- eddca5d: Per-source ingestion run tracking: each connector pass now records an IngestionRun (status + new-item
  count + timing) via `recordIngestionRun`; `getSourceStats` includes the latest run per source, and the
  /sources page shows a "Last run" column. Best-effort — recording never breaks an ingestion pass.
- Updated dependencies [eddca5d]
- Updated dependencies [2126da2]
- Updated dependencies [6035103]
- Updated dependencies [3f93fd8]
  - @aioi/database@0.10.0
  - @aioi/ai-sdk@0.3.0

## 0.2.0

### Minor Changes

- be9371c: Reddit ingestion connector (official Data API, app-only OAuth / client_credentials): fetches hot posts
  from configured subreddits, normalizes to SourceRecords, and dedupes through the shared
  SignalRepository. No-ops without `REDDIT_CLIENT_ID`/`SECRET` so CI stays green. Scheduled at :15/:45.
  Legality: OFFICIAL (public listings only, descriptive User-Agent, no scraping/PII).

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
