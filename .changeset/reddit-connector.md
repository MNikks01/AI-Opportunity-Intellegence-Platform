---
"@aioi/ingestion-service": minor
"@aioi/scheduler": minor
---

Reddit ingestion connector (official Data API, app-only OAuth / client_credentials): fetches hot posts
from configured subreddits, normalizes to SourceRecords, and dedupes through the shared
SignalRepository. No-ops without `REDDIT_CLIENT_ID`/`SECRET` so CI stays green. Scheduled at :15/:45.
Legality: OFFICIAL (public listings only, descriptive User-Agent, no scraping/PII).
