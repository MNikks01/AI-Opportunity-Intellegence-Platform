---
"@aioi/database": minor
"@aioi/web": minor
---

Supply-side tracking (M15-A / ADR-0005). The supply mirror of trend momentum: models, MCP servers, and
repos become first-class **tracked objects** with a time-series and momentum.

- **`EntitySnapshot`** model + migration: an append-only history point per tracked entity
  (`linkedTrendCount`, `signalWeight`), written each pipeline run.
- **`getEntityMomentumMap`** / **`computeMomentum`** (pure, unit-tested) derive accelerating / steady /
  cooling vs a ~7-day baseline, exactly like trends; **`listTrackedEntities`** powers the leaderboard.
- **`syncSupplyEntities`** upserts `MODEL` / `REPO` / `MCP_SERVER` entities directly from the structured
  Hugging Face + GitHub signals we already ingest (no new source), with a heuristic MCP-server detector.
- **`/entities`** gains a type-filterable, momentum-sortable **supply-side leaderboard** (with the shared
  momentum sparkline), and entity detail shows a momentum block.

Built entirely on existing OFFICIAL sources + the `Entity` model — no new data source, no legality gate,
offline-testable. Phase-2 watch/alert on a tracked entity (B-032) is deferred.
