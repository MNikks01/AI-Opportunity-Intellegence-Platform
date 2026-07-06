---
"@aioi/ingestion-service": minor
"@aioi/scheduler": minor
---

GitHub ingestion connector (official REST Search API): surfaces emerging AI repos (query + recency,
ranked by stars), normalizes to SourceRecords, dedupes via the shared SignalRepository. Works
unauthenticated; GITHUB_TOKEN raises the rate limit; GITHUB_QUERY tunes the search. Scheduled hourly.
Legality: OFFICIAL (public repos, required User-Agent, rate-limit aware).
