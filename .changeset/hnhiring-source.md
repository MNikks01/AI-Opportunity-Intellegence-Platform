---
"@aioi/ingestion-service": minor
"@aioi/web": patch
---

HN "Who is hiring?" job source (10th source). Reads the latest monthly Who-is-hiring thread via the
official keyless HN Algolia API and keeps AI/ML job posts — hiring is a leading indicator of demand,
and these flow through the normal clustering to add demand/momentum to the matching trend. New
hnhiring connector + runHnHiringIngestion, wired into the refresh pipeline.
