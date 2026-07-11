# ADR-0006 — Funding signal (SEC EDGAR Form D)

- **Status:** Accepted
- **Date:** 2026-07-11
- **Deciders:** Architect, Backend Engineer, Product
- **Context source:** M15 "competitor/funding/market dashboards" ([MILESTONES](../09-process/MILESTONES.md)),
  the `product-strategy-usp` demand framing, the **data-source rule** ([CLAUDE.md](../../CLAUDE.md)),
  [ADR-0001](ADR-0001-core-stack.md), [ADR-0005](ADR-0005-supply-side-tracking.md)

## Context

The USP is **supply × demand**. M15-A ([ADR-0005](ADR-0005-supply-side-tracking.md)) deepened the
_supply_ side (models/MCP/repos). The next M15 slice targets the _demand_ side: **funding** is one of the
strongest leading indicators of demand — money moving into a space precedes the products and jobs. Today
we mine soft demand ("I wish there was…") from Reddit/HN; we have **no hard funding signal**.

Adding one means adding a **new external data source**, which the **non-negotiable data-source rule**
requires us to classify (legality/ToS) before any connector ships — official/licensed only, no scraping.
So the core decision is _which source_. The options split on cost and coverage:

- **SEC EDGAR — Form D** (exempt/private securities offerings, i.e. US private funding rounds): a **free,
  official, public-domain** US-government API. Covers **US-domiciled** offerings only.
- **Crunchbase / PitchBook**: global, structured, richer — but **paid** (licensing + cost) and gated
  behind a commercial decision.
- **Press releases / news scraping**: rejected outright — ToS-violating and unreliable.

## Decision

### D1 — v1 funding source = **SEC EDGAR Form D**, classified OFFICIAL

Add a new `sec-edgar` connector (per the `data-source-integration` skill). Legality classification:

> **Source:** SEC EDGAR (Form D). **Classification: ✅ OFFICIAL** — U.S. SEC public APIs
> (`efts.sec.gov` full-text search + `data.sec.gov`), unauthenticated, **public-domain** U.S.-government
> data (no licensing). **Fair-access policy:** a declared `User-Agent` header is required and requests
> are limited (~10 req/s); the connector sets `SEC_USER_AGENT` and backs off on 429/403. **Auth:** none.
> **PII:** issuer/related-person names are public filing data.

Relevance is handled at query time: EDGAR **full-text search filtered to `forms=D`** + AI keyword
queries (mirroring how the npm/PyPI connectors filter broad feeds by AI keywords), so we ingest
AI-relevant private offerings, not every Reg D filing.

### D2 — Model funding as a **demand signal** in the existing pipeline

A Form D filing (an issuer raising capital in an AI space) normalizes to a `SourceRecord` like every
other source and flows through the **existing cluster → score pipeline** — no parallel path. Funding
signals raise the **demand axis** of the Golden Quadrant (money in = validated demand). The signal's
`raw` carries the structured Form D fields (issuer, offering amount if disclosed, filing date) for the
funding surface.

### D3 — Scope caveat: **US-only in v1**, global is a future paid decision

Form D is a US filing, so v1 funding coverage is **US-domiciled offerings only**. This is a real,
documented product limitation. **Global/structured funding (Crunchbase/PitchBook) is deferred to a
separate ADR** with its own cost/licensing decision — exactly the gate M15-A avoided and this ADR
consciously scopes around.

### D4 — A minimal **funding surface** (v1), not a full dashboard yet

v1 ships a focused **`/funding`** view: recent AI funding events (issuer, sector/trend, filing date) and
the trends they map to. The broader "competitor/market dashboard" (comparisons, org-level tracking) is
**v2**, once the signal proves useful — avoid building dashboard breadth before the data earns it.

### D5 — Offline-first, same as every source

The connector is **MSW-mocked** in tests and needs **no key** (only a `User-Agent`), so it runs green in
CI with zero secrets. In production it activates when `SEC_USER_AGENT` is set (a courtesy contact string
SEC asks for), degrading to a no-op otherwise — matching the adapter+Stub convention.

## Acceptance criteria (v1 = D1–D4)

1. **Connector:** `sec-edgar` connector with the legality header above; fetches AI-relevant Form D
   filings via EDGAR full-text search; Zod-validates; normalizes to `SourceRecord`; **idempotent**
   (re-run creates no duplicate signals). Rate-limit/backoff on 429/403.
2. **Tests (MSW):** happy path, 429+backoff, malformed payload (skipped), empty result, idempotent
   re-run — **before it ships** (data-source-integration skill).
3. **Pipeline:** funding signals cluster + score like any source; a funding signal contributes to the
   demand axis (verified via an integration test on the quadrant/demand mapping).
4. **Surface:** `/funding` lists recent AI funding events with their filing date and linked trend(s);
   loading/empty/error states; a11y assertions where testable.
5. **Registration + legality:** the source is registered with `LegalityTier.OFFICIAL`; `/sources` shows
   it; docs note the US-only scope.
6. **Gate:** `pnpm format:check && lint && typecheck && test && build` green with **no keys**.

## Alternatives considered

- **Crunchbase / PitchBook now.** Rejected for v1 — paid + licensing; a separate commercial decision.
  Revisit as a global-coverage enrichment once the free signal proves valuable.
- **Scraping funding news / aggregators.** Rejected outright — ToS-violating; the data-source rule is
  non-negotiable.
- **A paid news API (e.g., for funding announcements).** Deferred — cost + ToS review; EDGAR gives a
  clean official baseline first.
- **A parallel "funding" data model.** Rejected — funding is a `Signal` from a `Source` like everything
  else; reuse the pipeline, don't fork it.

## Consequences

- **Positive:** a genuine, **legally-clean, free** funding signal deepening the demand side of the USP;
  reuses the entire ingest→cluster→score pipeline and the Golden Quadrant; offline-testable, keyless CI.
- **Negative / cost:** **US-only** coverage and a **US-centric bias**; Form D is **noisy** (many small,
  non-AI offerings) — mitigated by AI-keyword full-text filtering, but relevance tuning will be needed;
  offering **amounts are often undisclosed** on Form D, so "how much" is partial.
- **Follow-ups:** v2 competitor/market dashboard; a future ADR for global/paid funding data; feeding
  funding into alerts ("a company just raised in a space you watch").

## Proposed backlog decomposition (M15-B)

- **B-033** — `sec-edgar` Form D connector (EDGAR FTS + AI-keyword filter) + MSW tests + legality header.
- **B-034** — register the source (`OFFICIAL`), wire into the refresh pipeline + `/sources`.
- **B-035** — funding → demand-axis contribution in clustering/quadrant (integration-tested).
- **B-036** — `/funding` surface: recent AI funding events + linked trends.
- **B-037** — (v2) competitor/market dashboard; (later) global/paid funding source ADR.
