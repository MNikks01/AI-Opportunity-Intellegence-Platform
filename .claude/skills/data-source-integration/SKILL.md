---
name: data-source-integration
description: Use when adding, modifying, or reviewing a data-source connector in the ingestion-service (Reddit, GitHub, Hacker News, Product Hunt, YouTube, X, ArXiv, Hugging Face, funding/startup databases, package registries, RSS/newsletters, etc.). Enforces legality/ToS classification, rate-limit and backoff handling, typed+validated output, idempotent BullMQ jobs, and MSW-mocked tests before any connector ships.
---

# Data Source Integration

This platform is fundamentally an ingestion engine. Every connector touches a third party
with its own auth model, rate limits, Terms of Service, and legal constraints. Getting this
wrong is a **legal and reliability risk**, not just a bug. This skill makes every connector
consistent, compliant, and testable.

## When to use
- Adding a new source to `services/ingestion-service`.
- Changing polling cadence, auth, or fields for an existing connector.
- Reviewing a PR that adds/edits a connector.

## When NOT to use
- Pure transform/scoring logic downstream of ingestion → use `opportunity-scoring-engine`.
- One-off manual data pulls that never enter the pipeline.

## Inputs
1. **Source name** and target data (e.g. "GitHub Trending repos, daily").
2. **Access method**: official API, documented feed (RSS/Atom), or scrape (last resort).
3. **Fields** to capture and **refresh cadence**.
4. Existing connector patterns in `services/ingestion-service/src/connectors/*` (read first for consistency).

## Outputs
A complete connector consisting of:
- A typed fetch client with a **Zod schema** for the raw response and a normalized `SourceRecord`.
- A **BullMQ** repeatable job (idempotent; dedupe key = stable source id + fetched window).
- **Rate-limit config** and exponential backoff with jitter; respects `Retry-After`.
- A **compliance header comment** citing the legality classification and ToS URL.
- **MSW-mocked tests** (happy path, rate-limited 429, malformed payload, empty result).
- A one-line registration in the scheduler + a `docs/data-sources/<source>.md` note.

## Workflow (do these in order)
1. **Classify legality** using `references/legality-classification.md`. Stop if the source is
   in the ❌ Prohibited column; escalate to a human. Record the classification in the connector header.
2. **Pick auth**: prefer official API keys in env/secret manager over scraping. Never hardcode.
3. **Model the data**: write the Zod schema for the raw payload, then map to the shared
   `SourceRecord` type in `packages/shared`.
4. **Implement fetch**: honor documented rate limits; backoff+jitter; respect `Retry-After` and
   `robots.txt` for any scrape. Set a descriptive `User-Agent`.
5. **Make it idempotent**: dedupe by stable id; upsert, never blind-insert. Store a cursor/etag.
6. **Handle PII**: strip or hash user identifiers unless there's a documented product reason to keep them.
7. **Write MSW tests** for the four cases above using fixtures under `__fixtures__/`.
8. **Register** the job in the scheduler and add the docs note (see checklist).

## Example (abbreviated)
> "Add a Hacker News top-stories connector, hourly."
Result: `connectors/hackernews.ts` using the official Firebase HN API (✅ official, no key),
Zod schema for the item shape, normalized to `SourceRecord`, hourly BullMQ repeatable job keyed
by story id, 429/backoff handling, MSW tests, and `docs/data-sources/hackernews.md` noting the
API is public and unauthenticated with no documented hard rate limit (still throttled to be polite).

## Best practices
- **Official API > documented feed > scrape.** Scraping is a last resort and must cite the ToS review.
- Centralize rate-limit + backoff in a shared helper; don't reimplement per connector.
- Every network call is timed and traced (OpenTelemetry span `ingest.<source>`).
- Fail closed on schema-validation errors: quarantine the record, alert, don't crash the worker.
- Keep fixtures small and real; refresh them when the source's shape changes.

## Failure modes to guard against
- **Silent ToS violation** — always run step 1; no connector ships without a classification.
- **Thundering herd on 429** — jitter is mandatory; never retry in a tight loop.
- **Non-idempotent inserts** creating duplicate trend records → poisons scoring.
- **Unbounded pagination** — cap pages; page cursors persisted so restarts resume, not restart.
- **Leaking API keys** into logs or the record payload.

## Quality checklist (must all pass before merge)
- [ ] Legality classification recorded in header + `docs/data-sources/<source>.md`
- [ ] ToS / `robots.txt` reviewed and cited (for any scrape)
- [ ] Documented rate limit respected; backoff + jitter; honors `Retry-After`
- [ ] Zod schema validates raw payload; normalized to shared `SourceRecord`
- [ ] Idempotent upsert with stable dedupe key; cursor/etag persisted
- [ ] PII stripped/hashed unless justified
- [ ] MSW tests: happy path, 429, malformed, empty
- [ ] OpenTelemetry span + structured logs (no secrets)
- [ ] Registered in scheduler with explicit cadence
