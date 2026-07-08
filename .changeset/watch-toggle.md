---
"@aioi/database": patch
"@aioi/ui": minor
"@aioi/web": minor
---

One-click "Watch" toggle on trend cards. `TrendCard` gains an `action` slot rendered above a stretched
card link (so a button stays clickable). New data helpers: `getOrCreatePrimaryWatchlist`,
`listWatchedTargetIds`, `removeWatchlistItemByTarget`.
