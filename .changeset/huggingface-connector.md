---
"@aioi/ingestion-service": minor
"@aioi/scheduler": minor
---

Hugging Face ingestion connector (official Hub API): ingests top models (by HF_SORT, default likes),
normalizes to SourceRecords, dedupes via the shared SignalRepository. Works unauthenticated;
HUGGINGFACE_TOKEN raises the rate limit. Scheduled hourly. Legality: OFFICIAL (public models only).
