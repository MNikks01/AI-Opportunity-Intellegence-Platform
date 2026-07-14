---
"@aioi/ingestion-service": minor
"@aioi/scheduler": minor
---

Generic RSS/Atom feed connector (`connectors/rss.ts`) — one connector, a registry of ~20 publisher
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
