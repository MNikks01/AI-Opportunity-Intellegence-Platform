---
"@aioi/database": minor
"@aioi/web": minor
---

Public RSS feed. A new `/feed.xml` RSS 2.0 route serves the newest scored opportunities (title, link,
opportunity score, build idea, pubDate) from a new `listTrendFeed` query, with feed-reader
autodiscovery via `<link rel="alternate" type="application/rss+xml">` in the document head. A
distribution channel for readers and automation, alongside the API/MCP surfaces.
