# @aioi/intel-core

## 0.2.0

### Minor Changes

- 5bce17e: AI & Tech Intelligence vertical — M2 (`packages/intel-core`). New pure, no-network/no-DB package holding
  the vertical's core logic: normalization (`cleanText`, `canonicalUrl`, `contentHash`, `detectLanguage`),
  dedupe (`shingles`/`jaccard`/`isNearDuplicate` lexical + `cosineSimilarity` for M4 embeddings), the
  rules-based relevance gate (`classifyByRules` — the cheap tier-1 filter before any LLM spend, with
  category + region hinting), and the canonical taxonomy (`CATEGORY_REGISTRY`, `REGIONS`, `isCategoryKey`),
  now the single source of truth. `@aioi/database` re-exports the registry from `@aioi/intel-core` instead
  of defining it locally (no behavior change). 30 unit tests. Design: AI_TECH_INTELLIGENCE_MODULE.md; ADR-0009.
- 246143f: AI & Tech Intelligence vertical — M5 (news search). Hybrid search over Signals: a raw-SQL migration adds
  a pgvector `embedding` (HNSW) + a STORED FTS `searchVector` (GIN) to Signal (mirroring the Trend search
  columns). `searchSignalsHybrid` fuses lexical (FTS `ts_rank`) and semantic (pgvector cosine) results via
  reciprocal-rank fusion, honoring shared taxonomy filters (region / category / min-opportunity / recency).
  `searchNews` runs the pure `parseNlQuery` (intel-core, no LLM) to turn phrases like "What happened in
  China today?" or "AI funding over $50M in Europe" into filters + semantic text — only one cheap embed
  call per search. `reembedSignals` backfills Signal embeddings (title + analysis TLDR) for rows missing
  one. Design: AI_TECH_INTELLIGENCE_MODULE.md; ADR-0009.
