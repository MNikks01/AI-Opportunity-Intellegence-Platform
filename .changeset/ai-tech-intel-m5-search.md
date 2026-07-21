---
"@aioi/database": minor
"@aioi/intel-core": minor
---

AI & Tech Intelligence vertical — M5 (news search). Hybrid search over Signals: a raw-SQL migration adds
a pgvector `embedding` (HNSW) + a STORED FTS `searchVector` (GIN) to Signal (mirroring the Trend search
columns). `searchSignalsHybrid` fuses lexical (FTS `ts_rank`) and semantic (pgvector cosine) results via
reciprocal-rank fusion, honoring shared taxonomy filters (region / category / min-opportunity / recency).
`searchNews` runs the pure `parseNlQuery` (intel-core, no LLM) to turn phrases like "What happened in
China today?" or "AI funding over $50M in Europe" into filters + semantic text — only one cheap embed
call per search. `reembedSignals` backfills Signal embeddings (title + analysis TLDR) for rows missing
one. Design: AI_TECH_INTELLIGENCE_MODULE.md; ADR-0009.
