---
"@aioi/ingestion-service": minor
"@aioi/database": minor
---

Global funding via Crunchbase (M15-B v2, B-037b / ADR-0008). A **LICENSED**, **key-gated** connector for
global AI funding rounds — the complement to the free, US-only SEC EDGAR source.

- `crunchbase` connector (Crunchbase Data API v4 search over recent AI-category rounds; Zod-validated,
  429/5xx backoff) — **inert without `CRUNCHBASE_API_KEY`** (no calls, no cost, CI stays keyless). Set the
  key (with a purchased license) and it activates automatically; the source auto-registers as LICENSED.
- Funding queries (`getTrendFundingHits`, `listRecentFunding`) now treat both `sec-edgar` **and**
  `crunchbase` as funding sources, so global events surface on `/funding` + `/market` and lift the
  Golden-Quadrant demand axis with no further changes. `ensureSource` gained an optional legality tier.
- MSW-mocked tests (happy/429/malformed/empty). Verified a crunchbase event auto-surfaces in the funding
  data + registers LICENSED.
