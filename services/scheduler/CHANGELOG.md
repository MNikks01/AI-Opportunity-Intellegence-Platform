# @aioi/scheduler

## 0.6.14

### Patch Changes

- Updated dependencies [1606922]
- Updated dependencies [89fa03c]
- Updated dependencies [f6907ac]
  - @aioi/ingestion-service@0.4.0
  - @aioi/database@0.20.0
  - @aioi/ai-service@0.7.1

## 0.6.13

### Patch Changes

- Updated dependencies [2d70e24]
- Updated dependencies [746979c]
  - @aioi/database@0.19.0
  - @aioi/ai-service@0.7.0
  - @aioi/shared@0.2.0
  - @aioi/ingestion-service@0.3.15

## 0.6.12

### Patch Changes

- Updated dependencies [dd48ae9]
  - @aioi/database@0.18.0
  - @aioi/ai-service@0.6.3
  - @aioi/ingestion-service@0.3.14

## 0.6.11

### Patch Changes

- Updated dependencies [e91c90b]
- Updated dependencies [dc47b88]
  - @aioi/database@0.17.0
  - @aioi/ai-service@0.6.2
  - @aioi/ingestion-service@0.3.13

## 0.6.10

### Patch Changes

- Updated dependencies [13a4d82]
  - @aioi/database@0.16.0
  - @aioi/ai-service@0.6.1
  - @aioi/ingestion-service@0.3.12

## 0.6.9

### Patch Changes

- Updated dependencies [bdc16f0]
  - @aioi/validation@0.3.0
  - @aioi/ai-service@0.6.0
  - @aioi/database@0.15.1
  - @aioi/ingestion-service@0.3.11

## 0.6.8

### Patch Changes

- Updated dependencies [20f71a4]
  - @aioi/database@0.15.0
  - @aioi/ai-service@0.5.0
  - @aioi/ingestion-service@0.3.10

## 0.6.7

### Patch Changes

- Updated dependencies [0fc7986]
- Updated dependencies [25880d3]
  - @aioi/database@0.14.1
  - @aioi/ai-service@0.4.7
  - @aioi/ingestion-service@0.3.9

## 0.6.6

### Patch Changes

- Updated dependencies [e7f0515]
- Updated dependencies [0a324c5]
- Updated dependencies [12c676f]
  - @aioi/database@0.14.0
  - @aioi/ai-service@0.4.6
  - @aioi/ingestion-service@0.3.8

## 0.6.5

### Patch Changes

- Updated dependencies [fbccec0]
- Updated dependencies [05b9e7f]
  - @aioi/database@0.13.0
  - @aioi/ai-service@0.4.5
  - @aioi/ingestion-service@0.3.7

## 0.6.4

### Patch Changes

- Updated dependencies [ed24c47]
  - @aioi/database@0.12.0
  - @aioi/ai-service@0.4.4
  - @aioi/ingestion-service@0.3.6

## 0.6.3

### Patch Changes

- Updated dependencies [aa401cc]
  - @aioi/shared@0.1.0
  - @aioi/database@0.11.3
  - @aioi/ai-service@0.4.3
  - @aioi/ingestion-service@0.3.5

## 0.6.2

### Patch Changes

- @aioi/database@0.11.2
- @aioi/ai-service@0.4.2
- @aioi/ingestion-service@0.3.4

## 0.6.1

### Patch Changes

- Updated dependencies [919cf06]
  - @aioi/database@0.11.1
  - @aioi/ai-service@0.4.1
  - @aioi/ingestion-service@0.3.3

## 0.6.0

### Minor Changes

- 773471d: Close the autonomous loop: clustered trends are now scored. `listUnscoredTrends` +
  `persistScoresForTrend` (@aioi/database) and `scoreClusteredTrends` (@aioi/ai-service) score
  clustering's unscored trends with the opportunity engine (+ embedding + alert eval); a scheduler
  scoring job runs after clustering. Pipeline is now end-to-end: ingest → cluster → score → alerts/briefs.

### Patch Changes

- Updated dependencies [773471d]
  - @aioi/ai-service@0.4.0
  - @aioi/database@0.11.0
  - @aioi/ingestion-service@0.3.2

## 0.5.1

### Patch Changes

- Updated dependencies [2271dca]
  - @aioi/ai-service@0.3.0
  - @aioi/database@0.10.1
  - @aioi/ingestion-service@0.3.1

## 0.5.0

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

- Updated dependencies [7106e88]
- Updated dependencies [a2ad9c5]
- Updated dependencies [eddca5d]
- Updated dependencies [1894852]
- Updated dependencies [2126da2]
- Updated dependencies [6035103]
- Updated dependencies [3f93fd8]
  - @aioi/ingestion-service@0.3.0
  - @aioi/database@0.10.0
  - @aioi/ai-service@0.2.1

## 0.4.0

### Minor Changes

- be9371c: Reddit ingestion connector (official Data API, app-only OAuth / client_credentials): fetches hot posts
  from configured subreddits, normalizes to SourceRecords, and dedupes through the shared
  SignalRepository. No-ops without `REDDIT_CLIENT_ID`/`SECRET` so CI stays green. Scheduled at :15/:45.
  Legality: OFFICIAL (public listings only, descriptive User-Agent, no scraping/PII).

### Patch Changes

- Updated dependencies [be9371c]
  - @aioi/ingestion-service@0.2.0

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
