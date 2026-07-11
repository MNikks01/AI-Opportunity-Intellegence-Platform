# ADR-0008 — Global funding data (paid source)

- **Status:** Proposed — **BLOCKED on a business decision** (not engineering)
- **Date:** 2026-07-11
- **Deciders:** Product / Founder (cost owner), Architect
- **Context source:** M15-B v2 (B-037b), [ADR-0006](ADR-0006-funding-signal.md) D3

## Context

M15-B shipped a **free, official** funding signal — SEC EDGAR Form D ([ADR-0006](ADR-0006-funding-signal.md)) —
but it is **US-only** by construction (Form D is a US filing). Extending funding coverage to **global**
private rounds (and richer fields: amounts, investors, stage) requires a **commercial data provider**.
The data-source rule forbids scraping, so this is not something we can build our way around — it is a
**purchase decision** with real cost, a contract, and API credentials the operator must provide.

**This ADR cannot be implemented by engineering alone. It is parked until the cost owner decides.**

## The decision to be made (by the operator)

| Option                            | Coverage          | Cost (indicative)     | Notes                                                |
| --------------------------------- | ----------------- | --------------------- | ---------------------------------------------------- |
| **Stay US-only (SEC EDGAR)**      | US private rounds | **$0**                | Status quo; good enough for a US-centric v1.         |
| **Crunchbase Basic/Pro API**      | Global            | paid (annual license) | Broad startup/funding coverage; well-documented API. |
| **PitchBook / Dealroom / Tracxn** | Global, deeper    | paid (enterprise)     | Richer but pricier; heavier contracts.               |
| **A news/aggregator API**         | Global, noisier   | paid                  | Needs its own ToS review; lower data quality.        |

## What engineering will do **once a source + budget are approved**

The architecture is already proven by ADR-0006, so adoption is mechanical:

1. Add a `crunchbase` (or chosen) connector under the `data-source-integration` skill — **legality
   classification: LICENSED** (not OFFICIAL), with the API key gated so CI stays keyless.
2. Normalize funding events to `SourceRecord` and flow them through the **existing** ingest → cluster →
   score pipeline — the same demand-axis lift the SEC connector already feeds (no new data model).
3. Surface global events on `/funding` + `/market` alongside the SEC ones, tagged by source.
4. MSW-mocked connector tests (happy/429/malformed/empty/idempotent) before it ships.

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
