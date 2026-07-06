---
"@aioi/ai-service": minor
"@aioi/database": minor
"@aioi/scheduler": minor
---

Signal → Trend clustering (B-006): `clusterSignals` (embed + greedy cosine, deterministic offline via
the StubEmbedder) + `clusterRecentSignals` orchestration, `listUnclusteredSignals`/
`createTrendFromSignalIds` in `@aioi/database`, and an hourly scheduler clustering job. Connects
ingestion → trends.
