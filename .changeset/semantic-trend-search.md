---
"@aioi/ai-sdk": minor
"@aioi/database": minor
"@aioi/api": minor
"@aioi/web": minor
---

Semantic trend search (B-019): an `Embedder` in `@aioi/ai-sdk` (Stub + LiteLLM, dim 1536), a pgvector
`embedding` column + HNSW cosine index on Trend backfilled on persist, `semanticSearchTrends(q)` and a
public `trends.semanticSearch` endpoint, and a Keyword/Semantic toggle on the trends search.
