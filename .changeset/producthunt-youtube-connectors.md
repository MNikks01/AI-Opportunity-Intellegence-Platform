---
"@aioi/ingestion-service": minor
"@aioi/scheduler": minor
---

Product Hunt (GraphQL v2) and YouTube (Data API v3) ingestion connectors: normalize launches/videos to
SourceRecords, dedupe via the shared SignalRepository, scheduled hourly. Both no-op without their key
(PRODUCTHUNT_TOKEN / YOUTUBE_API_KEY) so CI stays green. Legality: OFFICIAL (public metadata only).
This completes the six planned data sources.
