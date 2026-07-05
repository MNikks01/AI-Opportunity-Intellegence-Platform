---
"@aioi/database": minor
---

Alerts pipeline auto-eval (B-017): `persistScoredTrend` now calls `evaluateTrendAllOrgs`, which uses a
`SECURITY DEFINER` function (`app_orgs_watching_trend`) for RLS-safe cross-tenant discovery and fires
per-org notifications for matched alerts. Alerts fire automatically when new scores land.
