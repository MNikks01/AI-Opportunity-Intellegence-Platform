---
"@aioi/database": minor
"@aioi/api": minor
"@aioi/web": minor
---

Trend keyword full-text search (B-019): a STORED generated `searchVector` + GIN index on Trend, a
`searchTrends(q, limit)` repo (`plainto_tsquery`, ranked by `ts_rank` then recency), a public
`trends.search` tRPC endpoint, and a search box on the trends page. Semantic (pgvector) search follows.
