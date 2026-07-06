---
"@aioi/ai-sdk": minor
"@aioi/database": patch
---

Production-harden real embeddings: LiteLLMEmbedder now requests `dimensions: EMBED_DIM` (guarantees the
pgvector column matches any model), unit-normalizes each vector, preserves input order, retries
transient 429/5xx, and fails loudly on a count/dimension mismatch. Embedding backfill in
`persistScoredTrend` is best-effort (a provider outage no longer fails scoring). Adds a LiteLLM proxy
routing config so `text-embedding-3-small` + `claude-opus-4-8` resolve. With an OpenAI key, clustering

- semantic search become genuinely semantic; stub otherwise (CI green).
