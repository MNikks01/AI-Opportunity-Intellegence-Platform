# @aioi/ai-sdk

## 0.2.0

### Minor Changes

- c10faf2: Action-plan generators (B-021): `generateActionPlan` in `@aioi/ai-sdk` (Stub + LiteLLM, schema-validated)

  - `@aioi/ai-service` orchestration, `persistActionPlan`/`getActionPlan` with `getTrendBySlug` including
    the plan, an admin-gated `trends.generateActionPlan` mutation, and a plan section on the trend detail
    page. Also adds `main`/`types` to `@aioi/ai-service` so it can be imported.

### Patch Changes

- Updated dependencies [c10faf2]
  - @aioi/validation@0.2.0

## 0.1.0

### Minor Changes

- e7d23d8: Semantic trend search (B-019): an `Embedder` in `@aioi/ai-sdk` (Stub + LiteLLM, dim 1536), a pgvector
  `embedding` column + HNSW cosine index on Trend backfilled on persist, `semanticSearchTrends(q)` and a
  public `trends.semanticSearch` endpoint, and a Keyword/Semantic toggle on the trends search.

## 0.0.1

### Patch Changes

- Updated dependencies [5d583c8]
- Updated dependencies [0634493]
  - @aioi/validation@0.1.0
