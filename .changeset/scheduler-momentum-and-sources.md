---
"@aioi/scheduler": minor
---

Wire the momentum baseline + the remaining leading-indicator sources into the running cron. Three gaps
existed between shipped code and the live pipeline: (1) `recordTrendSnapshots` / `recordEntitySnapshots`
were written and tested but only ever called from the demo seed — so in production the momentum,
trajectory, and Golden-Quadrant-over-time features never accrued a baseline; (2) six built + tested
connectors (arXiv, npm, PyPI, HN "Who is hiring?", SEC EDGAR, Crunchbase) were never registered as jobs,
so they never ran; (3) neither was actually reachable from the scheduler.

This adds:

- A `snapshot:momentum` repeatable job (hourly at :25, after scoring at :15) calling
  `runSnapshotJob` → `recordTrendSnapshots` + `recordEntitySnapshots`. Unconditional, so the baseline
  starts building immediately. No-ops cleanly on an empty database.
- Six new ingestion jobs on fair-access cadences: arXiv (every 6h), PyPI (every 3h), and npm /
  HN-hiring / SEC EDGAR / Crunchbase (daily). The key-gated / licensed ones (SEC EDGAR, Crunchbase)
  stay inert with no config, so CI and dev remain green until keys are provisioned.

New exported job functions on `@aioi/scheduler`: `runSnapshotJob`, `runArxivIngestionJob`,
`runNpmIngestionJob`, `runPypiIngestionJob`, `runHnHiringIngestionJob`, `runSecEdgarIngestionJob`,
`runCrunchbaseIngestionJob`.
