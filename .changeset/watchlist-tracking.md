---
"@aioi/database": patch
"@aioi/web": minor
---

Close the browse→track loop: an "Add to watchlist" control on the trend page, and watchlist items now
resolve to the trend's title + opportunity score + link (via `getTrendsByIds`) instead of a raw id.
