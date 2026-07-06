---
"@aioi/database": minor
"@aioi/api": minor
"@aioi/web": minor
---

Connector health surface: `getSourceStats` (per-source signal counts + last-ingested time), an
admin-gated `sources.stats` tRPC endpoint, and a `/sources` page rendering it with the `@aioi/ui`
DataTable (source, signals, last ingested, legality tier).
