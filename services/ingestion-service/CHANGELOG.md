# @aioi/ingestion-service

## 0.11.1

### Patch Changes

- f012b0f: Fix Japan coverage. The Bridge (Japan) feed 403s the GitHub-Actions runner IP (worked locally, dead in
  prod), so Japan never ingested. Replace it with a Google News RSS query feed (news.google.com/rss — an
  official Google syndication endpoint built for feed readers, so it serves the CI runner) scoped to
  AI+Japan and tagged JAPAN. Verified: 93 AI-relevant items through the connector. We store only headline
  metadata + a link back to each source.
- Updated dependencies [4ccb69a]
- Updated dependencies [d62fbc2]
  - @aioi/database@0.27.2

## 0.11.0

### Minor Changes

- bb04178: Add Korea and Singapore AI/tech news feeds, extending the News map to the PRD's secondary tech regions.
  Three English feeds, each verified live through the connector: The Korea Times + BusinessKorea
  (SOUTH_KOREA) and Vulcan Post (SINGAPORE). Filtered to AI-relevant items. (Korea Tech Desk, e27, and
  Tech in Asia all 403 our User-Agent, so they were not added.)
- 7ab29c9: Add regional AI/tech news feeds so the News map/filters cover more than the US. Five English-language
  feeds, each verified live through the connector (not just the URL) and region-tagged: Pandaily (China),
  Inc42 (India), The Next Web + Sifted (Europe, incl. Germany), and The Bridge (Japan). Filtered to
  AI-relevant items; the source region tags the signal so non-US activity surfaces even when the analysis
  model is unsure. (Analytics India Magazine was verified as valid RSS but bot-blocks our User-Agent and
  returned nothing through the connector, so it was not added; Korea/Singapore feeds could not be verified
  and were left out.)

## 0.10.1

### Patch Changes

- Updated dependencies [c4f03ca]
  - @aioi/database@0.27.1

## 0.10.0

### Minor Changes

- a318f3e: AI & Tech Intelligence vertical — M3 (AI feed expansion + source tagging). Adds three big-tech AI feeds
  to the RSS registry — NVIDIA Blog, Microsoft Research, Meta Engineering (all verified live 2026-07-21,
  filtered to AI-relevant) — and tags every feed with an optional `region` and `defaultCategoryKey`
  (company/lab feeds get their home region + a fallback category; global publishers stay untagged so the
  per-article classifier decides). `SourceRecord` carries these source-level tags, `ensureSource(key, tier,
tags)` persists them to the `Source` row (set on create, synced on re-run, never cleared by an untagged
  call), and the RSS connector propagates them via `normalize`. Tests: registry-tag validity, tag
  propagation, and DB persistence. Design: AI_TECH_INTELLIGENCE_MODULE.md; ADR-0009.
- 9f0b508: AI & Tech Intelligence vertical — M9 (model-card enrichment), the final module. Populates `ModelCard` for
  tracked MODEL entities from the Hugging Face Hub API: `fetchModelDetail` + pure `parseModelCard` derive
  license, parameter count, and GGUF/MLX/vLLM/transformers availability from a model's HF detail (tags,
  safetensors, siblings, cardData). The `enrichModelCards` driver walks MODEL entities (the entity name is
  the HF repo id), fetches each, and upserts via `upsertModelCard` (idempotent) — models not on HF (e.g.
  GPT-5) return null and are skipped, best-effort per model. Adds `listModelsForEnrichment` / `upsertModelCard`
  to @aioi/database. Verified against the live HF API. Completes the vertical (M1–M9). Design:
  AI_TECH_INTELLIGENCE_MODULE.md; ADR-0009.

### Patch Changes

- Updated dependencies [8640a94]
- Updated dependencies [5bce17e]
- Updated dependencies [a318f3e]
- Updated dependencies [09d03cb]
- Updated dependencies [246143f]
- Updated dependencies [538c880]
- Updated dependencies [195a5c5]
- Updated dependencies [46cad64]
- Updated dependencies [9f0b508]
  - @aioi/database@0.27.0
  - @aioi/intel-core@0.2.0
  - @aioi/shared@0.3.0
  - @aioi/ai-sdk@0.8.0
  - @aioi/validation@0.5.0

## 0.9.0

### Minor Changes

- 62feae5: Three official-API connectors for signal that RSS can't cover:

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

- 651b63a: Generic RSS/Atom feed connector (`connectors/rss.ts`) — one connector, a registry of ~20 publisher
  feeds. A single parser handles both RSS `<item>` and Atom `<entry>`; each feed is registered as its own
  `Source` (`rss:<id>`) for per-publisher attribution, dedupe, and `/sources` health tracking. Broad
  publishers (TechCrunch, The Verge, AWS, …) are filtered to AI-relevant posts via word-boundary keyword
  matching; AI-native labs (OpenAI, DeepMind, Hugging Face, Google AI) and curated newsletters (Import AI,
  Latent Space, Simon Willison) are kept whole.

  All feed URLs were verified live (HTTP 200 + XML) on 2026-07-13. Per-feed failures are isolated — a dead
  or slow feed records a FAILED run and the batch continues. Classification is ✅ OFFICIAL (publisher-owned
  syndication feeds, no auth, no PII); polite backoff + jitter + descriptive User-Agent. Adding a feed is a
  one-line registry edit, no new code.

  Wired into the scheduler as `ingestion:rss`, every 2 hours. New exports: `runRssIngestion` /
  `runRssIngestionJob`, `RSS_FEEDS`, `fetchFeed`, `parseFeed`, `rssSourceKey`. Docs:
  `docs/data-sources/rss.md`. ToS-prohibited sources (X, LinkedIn, Google Trends/Scholar) remain excluded.

### Patch Changes

- Updated dependencies [3e0c633]
  - @aioi/database@0.26.1

## 0.8.0

### Minor Changes

- ad749a4: Global funding via Crunchbase (M15-B v2, B-037b / ADR-0008). A **LICENSED**, **key-gated** connector for
  global AI funding rounds — the complement to the free, US-only SEC EDGAR source.

  - `crunchbase` connector (Crunchbase Data API v4 search over recent AI-category rounds; Zod-validated,
    429/5xx backoff) — **inert without `CRUNCHBASE_API_KEY`** (no calls, no cost, CI stays keyless). Set the
    key (with a purchased license) and it activates automatically; the source auto-registers as LICENSED.
  - Funding queries (`getTrendFundingHits`, `listRecentFunding`) now treat both `sec-edgar` **and**
    `crunchbase` as funding sources, so global events surface on `/funding` + `/market` and lift the
    Golden-Quadrant demand axis with no further changes. `ensureSource` gained an optional legality tier.
  - MSW-mocked tests (happy/429/malformed/empty). Verified a crunchbase event auto-surfaces in the funding
    data + registers LICENSED.

### Patch Changes

- Updated dependencies [ad749a4]
- Updated dependencies [b6bf357]
- Updated dependencies [62a79b6]
  - @aioi/database@0.26.0
  - @aioi/validation@0.4.0
  - @aioi/ai-sdk@0.7.1

## 0.7.0

### Minor Changes

- e07f082: Funding signal (M15-B / ADR-0006). A new **SEC EDGAR Form D** source (US private funding rounds) — the
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

### Patch Changes

- Updated dependencies [e07f082]
- Updated dependencies [157b114]
  - @aioi/database@0.25.0

## 0.6.0

### Minor Changes

- 509db1d: HN "Who is hiring?" job source (10th source). Reads the latest monthly Who-is-hiring thread via the
  official keyless HN Algolia API and keeps AI/ML job posts — hiring is a leading indicator of demand,
  and these flow through the normal clustering to add demand/momentum to the matching trend. New
  hnhiring connector + runHnHiringIngestion, wired into the refresh pipeline.
- 7686759: PyPI source — a 9th connector. Reads the official, keyless PyPI newest-packages RSS feed and keeps
  the AI-relevant packages (a brand-new AI package is a leading indicator). New pypi connector +
  runPypiIngestion, wired into the refresh pipeline; appears in the source filter automatically.

### Patch Changes

- Updated dependencies [eb1fc88]
- Updated dependencies [e6dd752]
- Updated dependencies [6a8f4d4]
- Updated dependencies [b902d2c]
- Updated dependencies [b80c3c5]
- Updated dependencies [9d6d986]
- Updated dependencies [7daf15f]
- Updated dependencies [8a17bc7]
- Updated dependencies [4011ff2]
- Updated dependencies [7edad2e]
- Updated dependencies [d3eec43]
- Updated dependencies [7d8b33c]
  - @aioi/database@0.24.0
  - @aioi/ai-sdk@0.7.0

## 0.5.3

### Patch Changes

- Updated dependencies [ea8c984]
  - @aioi/database@0.23.1

## 0.5.2

### Patch Changes

- Updated dependencies [d122844]
  - @aioi/database@0.23.0

## 0.5.1

### Patch Changes

- Updated dependencies [a890f98]
- Updated dependencies [1009efc]
- Updated dependencies [a8f0a49]
  - @aioi/database@0.22.0

## 0.5.0

### Minor Changes

- f1f316e: npm source connector: ingest top AI packages by popularity from the official (keyless) npm registry
  search API — package adoption is a leading indicator. New fetchPackages + runNpmIngestion.

### Patch Changes

- Updated dependencies [149dd8d]
  - @aioi/database@0.21.0

## 0.4.0

### Minor Changes

- 1606922: arXiv source connector: ingest the latest cs.AI/cs.LG/cs.CL submissions from the official (keyless)
  arXiv Atom API — a leading indicator (research precedes products). New `fetchPapers` + `runArxivIngestion`,
  wired into the refresh pipeline; the source filter picks it up automatically.

### Patch Changes

- Updated dependencies [89fa03c]
- Updated dependencies [f6907ac]
  - @aioi/database@0.20.0

## 0.3.15

### Patch Changes

- Updated dependencies [2d70e24]
- Updated dependencies [746979c]
  - @aioi/database@0.19.0
  - @aioi/shared@0.2.0
  - @aioi/ai-sdk@0.6.1

## 0.3.14

### Patch Changes

- Updated dependencies [dd48ae9]
  - @aioi/database@0.18.0

## 0.3.13

### Patch Changes

- Updated dependencies [e91c90b]
- Updated dependencies [dc47b88]
  - @aioi/database@0.17.0

## 0.3.12

### Patch Changes

- Updated dependencies [13a4d82]
  - @aioi/database@0.16.0

## 0.3.11

### Patch Changes

- Updated dependencies [bdc16f0]
  - @aioi/validation@0.3.0
  - @aioi/ai-sdk@0.6.0
  - @aioi/database@0.15.1

## 0.3.10

### Patch Changes

- Updated dependencies [20f71a4]
  - @aioi/database@0.15.0

## 0.3.9

### Patch Changes

- Updated dependencies [0fc7986]
- Updated dependencies [25880d3]
  - @aioi/database@0.14.1

## 0.3.8

### Patch Changes

- Updated dependencies [e7f0515]
- Updated dependencies [0a324c5]
- Updated dependencies [12c676f]
  - @aioi/database@0.14.0

## 0.3.7

### Patch Changes

- Updated dependencies [fbccec0]
- Updated dependencies [05b9e7f]
  - @aioi/database@0.13.0

## 0.3.6

### Patch Changes

- Updated dependencies [ed24c47]
  - @aioi/database@0.12.0

## 0.3.5

### Patch Changes

- Updated dependencies [aa401cc]
  - @aioi/shared@0.1.0
  - @aioi/ai-sdk@0.5.1
  - @aioi/database@0.11.3

## 0.3.4

### Patch Changes

- Updated dependencies [1a568dd]
  - @aioi/ai-sdk@0.5.0
  - @aioi/database@0.11.2

## 0.3.3

### Patch Changes

- Updated dependencies [919cf06]
  - @aioi/database@0.11.1

## 0.3.2

### Patch Changes

- Updated dependencies [773471d]
  - @aioi/database@0.11.0

## 0.3.1

### Patch Changes

- Updated dependencies [6ae6fa5]
  - @aioi/ai-sdk@0.4.0
  - @aioi/database@0.10.1

## 0.3.0

### Minor Changes

- 7106e88: GitHub ingestion connector (official REST Search API): surfaces emerging AI repos (query + recency,
  ranked by stars), normalizes to SourceRecords, dedupes via the shared SignalRepository. Works
  unauthenticated; GITHUB_TOKEN raises the rate limit; GITHUB_QUERY tunes the search. Scheduled hourly.
  Legality: OFFICIAL (public repos, required User-Agent, rate-limit aware).
- a2ad9c5: Hugging Face ingestion connector (official Hub API): ingests top models (by HF_SORT, default likes),
  normalizes to SourceRecords, dedupes via the shared SignalRepository. Works unauthenticated;
  HUGGINGFACE_TOKEN raises the rate limit. Scheduled hourly. Legality: OFFICIAL (public models only).
- 1894852: Product Hunt (GraphQL v2) and YouTube (Data API v3) ingestion connectors: normalize launches/videos to
  SourceRecords, dedupe via the shared SignalRepository, scheduled hourly. Both no-op without their key
  (PRODUCTHUNT_TOKEN / YOUTUBE_API_KEY) so CI stays green. Legality: OFFICIAL (public metadata only).
  This completes the six planned data sources.

### Patch Changes

- eddca5d: Per-source ingestion run tracking: each connector pass now records an IngestionRun (status + new-item
  count + timing) via `recordIngestionRun`; `getSourceStats` includes the latest run per source, and the
  /sources page shows a "Last run" column. Best-effort — recording never breaks an ingestion pass.
- Updated dependencies [eddca5d]
- Updated dependencies [2126da2]
- Updated dependencies [6035103]
- Updated dependencies [3f93fd8]
  - @aioi/database@0.10.0
  - @aioi/ai-sdk@0.3.0

## 0.2.0

### Minor Changes

- be9371c: Reddit ingestion connector (official Data API, app-only OAuth / client_credentials): fetches hot posts
  from configured subreddits, normalizes to SourceRecords, and dedupes through the shared
  SignalRepository. No-ops without `REDDIT_CLIENT_ID`/`SECRET` so CI stays green. Scheduled at :15/:45.
  Legality: OFFICIAL (public listings only, descriptive User-Agent, no scraping/PII).

## 0.1.5

### Patch Changes

- Updated dependencies [da375de]
- Updated dependencies [bc95bde]
  - @aioi/database@0.9.0

## 0.1.4

### Patch Changes

- Updated dependencies [0d328db]
  - @aioi/database@0.8.0

## 0.1.3

### Patch Changes

- Updated dependencies [2995824]
  - @aioi/database@0.7.0

## 0.1.2

### Patch Changes

- dd23ccb: Scheduler service: `@aioi/scheduler` (BullMQ + cron) with `runIngestionJob` and `runDailyBriefsJob`
  (fan out `generateDailyBrief` over active orgs) as pure, testable job functions + a `startScheduler`
  worker. Adds `listActiveOrgIds` to `@aioi/database` and `main`/`types` to `@aioi/ingestion-service`.
- Updated dependencies [5488c28]
- Updated dependencies [dd23ccb]
  - @aioi/database@0.6.0

## 0.1.1

### Patch Changes

- Updated dependencies [c10faf2]
- Updated dependencies [4e6f14d]
  - @aioi/ai-sdk@0.2.0
  - @aioi/database@0.5.0
  - @aioi/validation@0.2.0

## 0.1.0

### Minor Changes

- a46e4ef: Prisma-backed `SignalRepository` (B-024): persists connector output to `Signal` with idempotent
  `createMany({ skipDuplicates })` dedupe, ensuring the `Source` first. `createSignalRepository()` selects
  Prisma when a DB is configured; `runHackerNewsIngestion` defaults to it.

### Patch Changes

- Updated dependencies [5762d93]
- Updated dependencies [486c37f]
- Updated dependencies [e7d23d8]
- Updated dependencies [c01468e]
  - @aioi/database@0.4.0
  - @aioi/ai-sdk@0.1.0

## 0.0.3

### Patch Changes

- Updated dependencies [5d583c8]
- Updated dependencies [0634493]
  - @aioi/database@0.3.0
  - @aioi/validation@0.1.0
  - @aioi/ai-sdk@0.0.1

## 0.0.2

### Patch Changes

- Updated dependencies [c2a8c88]
- Updated dependencies [8a43b68]
  - @aioi/database@0.2.0

## 0.0.1

### Patch Changes

- Updated dependencies [1bc6a1b]
  - @aioi/database@0.1.0
