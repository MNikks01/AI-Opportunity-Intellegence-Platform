---
"@aioi/ingestion-service": minor
"@aioi/scheduler": minor
---

Three official-API connectors for signal that RSS can't cover:

- **Semantic Scholar** (`semantic-scholar`) — newest AI papers via the Academic Graph bulk search
  (sorted by publication date); a cross-venue leading indicator complementing arXiv, with citation
  counts. Optional `SEMANTIC_SCHOLAR_API_KEY` raises the rate limit; keyless 429s degrade to a no-op.
  Every 6h.
- **Remote OK** (`remoteok`) — current remote AI job postings; hiring is a leading demand signal. Our
  own word-boundary AI filter drops ~90% non-AI noise. Honors the feed's attribution ToS via the stored
  job URL. Keyless (descriptive User-Agent). 2×/day.
- **Stack Exchange** (`stackexchange`) — newest Stack Overflow questions across AI tags; a burst on a tag
  is a leading demand/pain signal. One request per tag, deduped. Keyless 300 req/day; `STACKEXCHANGE_KEY`
  raises to 10k. Every 4h.

All three: Zod-validated → `SourceRecord`, backoff + jitter honoring `Retry-After`, idempotent upsert,
✅ OFFICIAL classification in-header + `docs/data-sources/*.md`, MSW-style unit tests, and graceful
degradation (a rate-limit/quota failure records a failed run and returns zeros instead of throwing).
Wired into the scheduler as `ingestion:semantic-scholar` / `ingestion:remoteok` / `ingestion:stackexchange`.
