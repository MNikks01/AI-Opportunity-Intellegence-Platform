# Data source: Remote OK

**Connector:** `services/ingestion-service/src/connectors/remoteok.ts`
**Source key:** `remoteok` · **Legality tier:** ✅ OFFICIAL
**Auth:** none (descriptive User-Agent required) · **PII:** none · **Cadence:** 2×/day

Public jobs API (`remoteok.com/api`). Remote hiring is a leading **demand** signal — a company paying to
post a role for a capability is committing to build with it.

**Attribution obligation:** the feed's ToS (returned in the first array element) asks consumers to link
back to the Remote OK job URL and credit Remote OK. We satisfy this by storing each job's canonical `url`
on the SourceRecord (surfaced wherever the signal appears) and crediting the source in this note. The
first array element is a legal/metadata object and is skipped.

The feed is site-wide and its tag filter is fuzzy, so we apply our own word-boundary AI-relevance filter
(≈90% of postings are dropped as non-AI). Backoff + jitter honors `Retry-After`. ToS reviewed 2026-07-14.
