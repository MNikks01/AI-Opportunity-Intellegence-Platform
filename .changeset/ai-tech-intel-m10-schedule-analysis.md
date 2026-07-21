---
"@aioi/scheduler": minor
---

AI & Tech Intelligence vertical — M10 (schedule analysis + enrichment). Wires the two deferred pipeline
jobs into the scheduler so the vertical actually populates in production: `analyze:signals` runs the
per-article analysis pass (`analyzeSignals`, cost-capped budget 40) hourly at :20 — filling the News feed,
region map, and category filters with `SignalAnalysis` — and `enrichment:model-cards` runs `enrichModelCards`
every 6h at :30 to populate the model tracker from Hugging Face. Without this, ingestion/clustering/trend
scoring ran but the M4/M9 drivers never did, leaving `/feed` and `/map` empty. Adds `runAnalyzeSignalsJob`
/ `runModelCardEnrichmentJob` + their cron registration and worker dispatch.
