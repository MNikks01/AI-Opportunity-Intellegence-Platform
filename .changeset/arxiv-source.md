---
"@aioi/ingestion-service": minor
---

arXiv source connector: ingest the latest cs.AI/cs.LG/cs.CL submissions from the official (keyless)
arXiv Atom API — a leading indicator (research precedes products). New `fetchPapers` + `runArxivIngestion`,
wired into the refresh pipeline; the source filter picks it up automatically.
