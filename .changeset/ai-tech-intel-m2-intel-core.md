---
"@aioi/intel-core": minor
"@aioi/database": patch
---

AI & Tech Intelligence vertical — M2 (`packages/intel-core`). New pure, no-network/no-DB package holding
the vertical's core logic: normalization (`cleanText`, `canonicalUrl`, `contentHash`, `detectLanguage`),
dedupe (`shingles`/`jaccard`/`isNearDuplicate` lexical + `cosineSimilarity` for M4 embeddings), the
rules-based relevance gate (`classifyByRules` — the cheap tier-1 filter before any LLM spend, with
category + region hinting), and the canonical taxonomy (`CATEGORY_REGISTRY`, `REGIONS`, `isCategoryKey`),
now the single source of truth. `@aioi/database` re-exports the registry from `@aioi/intel-core` instead
of defining it locally (no behavior change). 30 unit tests. Design: AI_TECH_INTELLIGENCE_MODULE.md; ADR-0009.
