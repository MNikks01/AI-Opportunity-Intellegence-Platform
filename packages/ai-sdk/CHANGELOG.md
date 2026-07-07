# @aioi/ai-sdk

## 0.5.1

### Patch Changes

- Updated dependencies [aa401cc]
  - @aioi/shared@0.1.0

## 0.5.0

### Minor Changes

- 1a568dd: Support calling a provider directly (no gateway): the LiteLLM client/embedder accept an optional bearer
  token from `AIOI_LLM_API_KEY`, so `LITELLM_BASE_URL=https://api.openai.com/v1` + `AIOI_LLM_API_KEY=sk-…`
  does real embeddings + scoring in serverless/CI without hosting a LiteLLM proxy. Local proxy flow is
  unchanged (no key → no auth header). Verified live against OpenAI.

## 0.4.0

### Minor Changes

- 6ae6fa5: Auto-select the scoring model to match the configured provider key (`defaultChatModel`): Anthropic →
  claude-opus-4-8, OpenAI → gpt-4o-mini, `AIOI_SCORING_MODEL` always wins. Previously the default was
  Anthropic-specific, so a user with only an OpenAI key got a real provider that 401'd. Now one key just
  works.

## 0.3.0

### Minor Changes

- 2126da2: Production-harden real embeddings: LiteLLMEmbedder now requests `dimensions: EMBED_DIM` (guarantees the
  pgvector column matches any model), unit-normalizes each vector, preserves input order, retries
  transient 429/5xx, and fails loudly on a count/dimension mismatch. Embedding backfill in
  `persistScoredTrend` is best-effort (a provider outage no longer fails scoring). Adds a LiteLLM proxy
  routing config so `text-embedding-3-small` + `claude-opus-4-8` resolve. With an OpenAI key, clustering

  - semantic search become genuinely semantic; stub otherwise (CI green).

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
