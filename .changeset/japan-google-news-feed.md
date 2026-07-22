---
"@aioi/ingestion-service": patch
---

Fix Japan coverage. The Bridge (Japan) feed 403s the GitHub-Actions runner IP (worked locally, dead in
prod), so Japan never ingested. Replace it with a Google News RSS query feed (news.google.com/rss — an
official Google syndication endpoint built for feed readers, so it serves the CI runner) scoped to
AI+Japan and tagged JAPAN. Verified: 93 AI-relevant items through the connector. We store only headline
metadata + a link back to each source.
