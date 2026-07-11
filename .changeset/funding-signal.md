---
"@aioi/ingestion-service": minor
"@aioi/database": minor
"@aioi/web": minor
---

Funding signal (M15-B / ADR-0006). A new **SEC EDGAR Form D** source (US private funding rounds) — the
demand-side counterpart to M15-A. Free, official, public-domain; classified OFFICIAL.

- **`sec-edgar` connector** (`fetchFormDFilings`): EDGAR full-text search filtered to Form D + AI phrases,
  Zod-validated, idempotent, backoff on 429/403. Needs a contact `SEC_USER_AGENT` (SEC fair-access) —
  no-ops without it, so CI/dev stay green with no config. MSW-style tests (happy/429/malformed/empty/
  dedupe). Wired into the refresh pipeline; auto-registers on `/sources`.
- **Funding → demand axis:** funding filings lift a trend on the Golden Quadrant's demand axis (money in
  = validated demand) via `getTrendFundingHits` + a capped per-signal lift; `QuadrantTrend.fundingSignals`
  added. `listRecentFunding` powers the surface.
- **`/funding` surface:** recent AI funding events (issuer, filing date, SEC link) with the trends each
  maps to. Honest US-only scope note.

US-only in v1 (Form D is a US filing); global/paid funding is a separate future ADR. Built on the
existing ingest→cluster→score pipeline; offline-testable, keyless CI.
