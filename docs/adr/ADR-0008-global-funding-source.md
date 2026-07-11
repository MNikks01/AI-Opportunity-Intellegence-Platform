# ADR-0008 — Global funding data (paid source)

- **Status:** Accepted — **connector built + gated** on `CRUNCHBASE_API_KEY`; activates automatically
  when a license is provisioned. Zero cost/calls until then. (Provider choice = Crunchbase for v1.)
- **Date:** 2026-07-11
- **Deciders:** Product / Founder (cost owner), Architect
- **Context source:** M15-B v2 (B-037b), [ADR-0006](ADR-0006-funding-signal.md) D3

## Context

M15-B shipped a **free, official** funding signal — SEC EDGAR Form D ([ADR-0006](ADR-0006-funding-signal.md)) —
but it is **US-only** by construction (Form D is a US filing). Extending funding coverage to **global**
private rounds (and richer fields: amounts, investors, stage) requires a **commercial data provider**.
The data-source rule forbids scraping, so this is not something we can build our way around — it is a
**purchase decision** with real cost, a contract, and API credentials the operator must provide.

**Update (2026-07-11):** the operator chose to build the connector now (gated) rather than wait — so
when a Crunchbase license is later purchased and `CRUNCHBASE_API_KEY` set, global funding starts flowing
**automatically** with no further engineering. Until then the connector is inert (no calls, no cost).

## The decision to be made (by the operator)

| Option                            | Coverage          | Cost (indicative)     | Notes                                                |
| --------------------------------- | ----------------- | --------------------- | ---------------------------------------------------- |
| **Stay US-only (SEC EDGAR)**      | US private rounds | **$0**                | Status quo; good enough for a US-centric v1.         |
| **Crunchbase Basic/Pro API**      | Global            | paid (annual license) | Broad startup/funding coverage; well-documented API. |
| **PitchBook / Dealroom / Tracxn** | Global, deeper    | paid (enterprise)     | Richer but pricier; heavier contracts.               |
| **A news/aggregator API**         | Global, noisier   | paid                  | Needs its own ToS review; lower data quality.        |

## What was built (gated; done)

The architecture was already proven by ADR-0006, so adoption was mechanical — **shipped**:

1. ✅ `crunchbase` connector (`services/ingestion-service/src/connectors/crunchbase.ts`) — **LICENSED**
   legality header; Crunchbase Data API v4 search over recent AI-category funding rounds; Zod-validated;
   429/5xx backoff; **inert without `CRUNCHBASE_API_KEY`**. MSW-mocked tests (happy/429/malformed/empty).
2. ✅ Funding events normalize to `SourceRecord` and flow through the **existing** ingest → cluster →
   score pipeline — the same demand-axis lift the SEC connector feeds (no new data model). The source
   auto-registers as **LICENSED** on first ingest.
3. ✅ `getTrendFundingHits` / `listRecentFunding` treat both `sec-edgar` **and** `crunchbase` as funding
   sources, so global events appear on `/funding` + `/market` and lift the Golden-Quadrant demand axis
   **automatically** once the key is set.

**Only thing left = a purchased Crunchbase license + `CRUNCHBASE_API_KEY`.** No code changes needed then.

## Acceptance criteria (deferred until unblocked)

- A signed/approved data license + API credentials in the operator's secrets.
- Connector with a **LICENSED** legality header + tests; keyless CI unaffected.
- Global funding visible on `/funding` and `/market`, source-tagged.

## Consequences

- **Positive:** removes the US-only limitation — the single biggest gap in the funding signal.
- **Cost / blocker:** a **recurring license cost** and a **contract** — a business decision, not a
  technical one. Until then, funding remains US-only via the free SEC source, which is explicitly fine
  for v1.

## Status note

Recorded so the decision is visible and the implementation path is ready. **No code will be written
against this ADR until the operator selects a provider and provisions credentials.**
