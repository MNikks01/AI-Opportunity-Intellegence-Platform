# @aioi/ai-service

## 0.4.1

### Patch Changes

- Updated dependencies [919cf06]
  - @aioi/database@0.11.1

## 0.4.0

### Minor Changes

- 773471d: Close the autonomous loop: clustered trends are now scored. `listUnscoredTrends` +
  `persistScoresForTrend` (@aioi/database) and `scoreClusteredTrends` (@aioi/ai-service) score
  clustering's unscored trends with the opportunity engine (+ embedding + alert eval); a scheduler
  scoring job runs after clustering. Pipeline is now end-to-end: ingest → cluster → score → alerts/briefs.

### Patch Changes

- Updated dependencies [773471d]
  - @aioi/database@0.11.0

## 0.3.0

### Minor Changes

- 2271dca: Tune the clustering cosine threshold for real embeddings: the default drops 0.72 → 0.5 (env-override
  `CLUSTER_THRESHOLD`), so differently-worded, cross-source signals about the same topic actually merge
  into one trend (measured ~0.55 for related, ~0.2 for unrelated). Also quotes special values in
  `.env.example` so `source .env` works.

### Patch Changes

- Updated dependencies [6ae6fa5]
  - @aioi/ai-sdk@0.4.0
  - @aioi/database@0.10.1

## 0.2.1

### Patch Changes

- Updated dependencies [eddca5d]
- Updated dependencies [2126da2]
- Updated dependencies [6035103]
- Updated dependencies [3f93fd8]
  - @aioi/database@0.10.0
  - @aioi/ai-sdk@0.3.0

## 0.2.0

### Minor Changes

- c4ac5c2: LLM eval harness golden gate (B-009): `runEvalHarness` scores/plans a golden trend and checks
  invariants + determinism (10 dims, schema-valid, in-range, evidence-grounded, composite opportunity,
  schema-valid non-empty action plan, deterministic). A test runs it so a regression in AI logic fails CI.
- bc95bde: Signal → Trend clustering (B-006): `clusterSignals` (embed + greedy cosine, deterministic offline via
  the StubEmbedder) + `clusterRecentSignals` orchestration, `listUnclusteredSignals`/
  `createTrendFromSignalIds` in `@aioi/database`, and an hourly scheduler clustering job. Connects
  ingestion → trends.

### Patch Changes

- Updated dependencies [da375de]
- Updated dependencies [bc95bde]
  - @aioi/database@0.9.0

## 0.1.3

### Patch Changes

- Updated dependencies [0d328db]
  - @aioi/database@0.8.0

## 0.1.2

### Patch Changes

- Updated dependencies [2995824]
  - @aioi/database@0.7.0

## 0.1.1

### Patch Changes

- Updated dependencies [5488c28]
- Updated dependencies [dd23ccb]
  - @aioi/database@0.6.0

## 0.1.0

### Minor Changes

- c10faf2: Action-plan generators (B-021): `generateActionPlan` in `@aioi/ai-sdk` (Stub + LiteLLM, schema-validated)

  - `@aioi/ai-service` orchestration, `persistActionPlan`/`getActionPlan` with `getTrendBySlug` including
    the plan, an admin-gated `trends.generateActionPlan` mutation, and a plan section on the trend detail
    page. Also adds `main`/`types` to `@aioi/ai-service` so it can be imported.

### Patch Changes

- Updated dependencies [c10faf2]
- Updated dependencies [4e6f14d]
  - @aioi/ai-sdk@0.2.0
  - @aioi/database@0.5.0
  - @aioi/validation@0.2.0

## 0.0.4

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
