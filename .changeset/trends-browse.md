---
"@aioi/database": minor
---

`listTrendsPage({ source, status, sort, page, pageSize })` — browse trends filtered by source (`Source.key`)
and status, sorted by recency or any score dimension (highest first), with pagination. Dimension-sort
orders ids via composable, injection-safe raw SQL then hydrates. Backs the trends browse controls.
