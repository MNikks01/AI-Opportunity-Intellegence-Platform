---
---

Fix empty News feed, map, model tracker, and funding in the deployed app. Production runs the pipeline
via the `refresh-data` GitHub Action (`scripts/demo-data.ts`), **not** the BullMQ scheduler — so the M4
`analyzeSignals` and M9 `enrichModelCards` passes never ran there, and RSS (the AI/tech news feeds) was
never ingested. The refresh script now runs RSS + semantic-scholar + stackexchange ingestion, then
`analyzeSignals` (fills `SignalAnalysis` → News feed / region map / category filters) and
`enrichModelCards`, and the workflow now passes `SEC_USER_AGENT` through so the SEC EDGAR funding feed
activates. Verified end-to-end: one refresh run produced 61 analyzed news items (region-tagged), 45
funding filings, and 20 enriched model cards. (No package version change — pipeline script + workflow only.)
