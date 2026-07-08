---
"@aioi/database": patch
"@aioi/ui": patch
---

Product Hunt connector captures rich launch data (website, makers, topics, thumbnail, comment count) and
the trend detail renders it: what it is (tagline), the problem (description), who built it (makers + links),
product + Product Hunt links, and topics. `getTrendResources` now returns the signal's raw payload.
