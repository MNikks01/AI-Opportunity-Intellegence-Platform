# Data source: RSS / Atom feeds

**Connector:** `services/ingestion-service/src/connectors/rss.ts`
**Source keys:** `rss:<feedId>` (one `Source` row per feed)
**Legality tier:** ✅ OFFICIAL
**Auth:** none · **PII:** none · **Cadence:** every 2h (`45 */2 * * *`)

## Why it's legal

Every entry in the registry is a publisher's own, publicly documented RSS/Atom endpoint — feeds exist
precisely for syndication. We fetch over HTTPS with a descriptive `User-Agent`, back off on `429`/`5xx`
with jitter, and store only public post metadata (title, link, summary, publish date). No scraping, no
auth, no personal data. This is the "documented feed" tier of the data-source policy (official API >
documented feed > scrape).

## Design

One connector, many feeds. A single parser handles both RSS `<item>` and Atom `<entry>`. Each feed is
registered as its own `Source` (`rss:openai`, `rss:techcrunch`, …) so per-publisher attribution,
dedupe (`sourceId` + `externalId`), and the `/sources` health view all work. Per-feed failures are
isolated: a dead or slow feed records a FAILED run and the batch continues.

General-interest publishers carry `aiFilter: true` and keep only AI-relevant posts (word-boundary
keyword match, so "email"/"maintain" don't false-positive). AI-native labs, curated AI newsletters, and
already-AI-scoped tag feeds keep every item.

## Adding a feed

Append to `RSS_FEEDS` in the connector — **no new code**. Verify the URL returns HTTP 200 + XML first,
then choose `aiFilter` (true for broad publishers, false for AI-native/curated).

## Registry (verified live 2026-07-13)

| Feed                                                                    | Category             | AI filter |
| ----------------------------------------------------------------------- | -------------------- | --------- |
| OpenAI, Google DeepMind, Hugging Face, Google AI                        | research             | no        |
| Import AI, Latent Space, Simon Willison                                 | newsletter           | no        |
| Wired · AI, DEV · AI                                                    | news/dev (AI-scoped) | no        |
| Y Combinator                                                            | vc                   | no        |
| TechCrunch, The Verge, Ars Technica, VentureBeat, MIT Technology Review | news                 | yes       |
| Crunchbase News                                                         | vc                   | yes       |
| Cloudflare, AWS, Google Cloud                                           | cloud/infra          | yes       |
| Stack Overflow Blog                                                     | dev                  | yes       |

## Excluded (and why)

- **X/Twitter, LinkedIn, Google Trends/Scholar** — ToS-prohibited scraping / no official feed. Banned.
- **Anthropic, a16z, Mistral, LangChain, Cohere** — no working public RSS as of 2026-07-13 (endpoints
  return 404 or HTML). Add later if/when they publish one.
- **Exploding Topics / Glimpse** — competitors, proprietary data, not ingestible sources.
