# Data source: Semantic Scholar

**Connector:** `services/ingestion-service/src/connectors/semantic-scholar.ts`
**Source key:** `semantic-scholar` · **Legality tier:** ✅ OFFICIAL
**Auth:** optional `SEMANTIC_SCHOLAR_API_KEY` (x-api-key) · **PII:** none · **Cadence:** every 6h

Public Academic Graph API (`api.semanticscholar.org/graph/v1`). We read the newest AI papers via bulk
search (`sort=publicationDate:desc`) — a cross-venue leading indicator that complements arXiv and carries
a citation count. Keyless access shares a low rate pool, so a 429 is expected without a key; the run
**degrades to a no-op** (records a failed run, returns zeros) rather than throwing, and activates fully
once `SEMANTIC_SCHOLAR_API_KEY` is set. Exponential backoff + jitter honors `Retry-After`. Author names
(public) are kept only in `raw`. ToS: https://www.semanticscholar.org/product/api (reviewed 2026-07-14).
