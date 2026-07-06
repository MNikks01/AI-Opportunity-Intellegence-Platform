---
"@aioi/database": minor
---

Add `reembedAllTrends` + a `scripts/reembed-trends.ts` ops command to re-embed all existing trends with
the currently-configured embedder — run after switching on a real embed model so trends created with
the Stub become semantically searchable. Batched; a failed batch is logged and skipped.
