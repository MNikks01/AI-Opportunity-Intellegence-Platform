---
"@aioi/ai-service": minor
"@aioi/database": minor
"@aioi/scheduler": minor
---

Close the autonomous loop: clustered trends are now scored. `listUnscoredTrends` +
`persistScoresForTrend` (@aioi/database) and `scoreClusteredTrends` (@aioi/ai-service) score
clustering's unscored trends with the opportunity engine (+ embedding + alert eval); a scheduler
scoring job runs after clustering. Pipeline is now end-to-end: ingest → cluster → score → alerts/briefs.
