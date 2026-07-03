# Data Source Legality Classification

Classify **every** source into one column before writing a connector. Record the result
(and the ToS URL you checked) in the connector header comment and in
`docs/data-sources/<source>.md`. When in doubt, treat as the more restrictive column and escalate.

> This is engineering guidance, not legal advice. Anything landing in ❌ or unclear ⚠️ cases
> must be reviewed by a human before shipping.

## ✅ Official / Permitted
Documented public API or feed, used within its terms and rate limits.

| Source | Method | Notes |
|---|---|---|
| Hacker News | Firebase API | Public, unauthenticated. Be polite (throttle). |
| GitHub (REST/GraphQL) | API + token | 5k req/hr authenticated. Respect `X-RateLimit-*`. |
| Reddit | OAuth API | Requires app registration + OAuth; honor per-app limits and API ToS. |
| Product Hunt | GraphQL API | OAuth token required. |
| YouTube | Data API v3 | Quota units per call — budget carefully. |
| ArXiv | Atom API | Documented; request delay of ~3s recommended. |
| Hugging Face | Hub API | Token for higher limits. |
| Papers with Code | API | Check current ToS. |
| Package registries (npm/PyPI) | API/replicate | Public metadata. |
| RSS/Atom newsletters | Feed | Only where the publisher offers a feed. |

## ⚠️ Gray area — requires review
Technically fetchable but ToS-restricted, ambiguous, or requiring paid/partner access.

| Source | Concern |
|---|---|
| Google Trends | No official API; unofficial endpoints violate ToS / are unstable. Prefer a licensed provider or a compliant dataset. |
| LinkedIn | Scraping prohibited by ToS and litigated. Use official partner APIs only. |
| TechCrunch / The Verge (full articles) | Copyright — store links + short excerpts/metadata, not full text. |
| Funding/startup databases (Crunchbase-style) | Usually require a paid license; check contract terms. |

## ❌ Prohibited — do not build a scraper
Do **not** implement; escalate for a licensed/official alternative.

- **X/Twitter** via scraping or unofficial endpoints — ToS prohibits it; use the official (paid) API only.
- Any source whose ToS explicitly forbids automated access with no API offered.
- Any source requiring circumvention of auth, paywalls, or rate limits.
- Bulk collection of personal data (GDPR/CCPA exposure).

## Header comment template
```ts
/**
 * Source: <name>
 * Classification: ✅ Official | ⚠️ Gray (reviewed by <who>, <date>) | ❌ N/A
 * ToS reviewed: <url> (<date>)
 * Auth: <api key env var | oauth | none>
 * Documented rate limit: <value> — handled via <shared limiter>
 * PII: <none | hashed | justified: <reason>>
 */
```
