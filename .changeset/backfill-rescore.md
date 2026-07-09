---
"@aioi/database": minor
"@aioi/ai-service": minor
---

Opt-in backfill re-score: `pnpm rescore` upgrades existing (Stub-era) trend scores to the configured
real model, overwriting in place. Batched + queue-rotating (stalest first) so a full backfill runs
incrementally under cost control; refuses to run on the Stub; RESCORE_DRY estimates without spend.
New `rescoreTrends` + `listTrendsForRescore`/`touchTrend`/`countScoredTrends`.
