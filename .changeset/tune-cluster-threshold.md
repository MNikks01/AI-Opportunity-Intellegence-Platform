---
"@aioi/ai-service": minor
---

Tune the clustering cosine threshold for real embeddings: the default drops 0.72 → 0.5 (env-override
`CLUSTER_THRESHOLD`), so differently-worded, cross-source signals about the same topic actually merge
into one trend (measured ~0.55 for related, ~0.2 for unrelated). Also quotes special values in
`.env.example` so `source .env` works.
