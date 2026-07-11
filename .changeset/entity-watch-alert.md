---
"@aioi/database": minor
"@aioi/validation": minor
"@aioi/web": minor
---

Watch + alert on a tracked entity (M15-A phase 2, B-032). You can now **watch** a supply-side entity
(model / MCP server / repo) from its detail page and be alerted when it's **accelerating**.

- New `ENTITY_MOMENTUM` alert trigger (`@aioi/validation`); the watchlist alert form offers "Entity
  accelerating".
- `evaluateEntityAlertsAllOrgs` (run in the pipeline after entity snapshots) notifies each org whose
  watched entities are accelerating — reusing the existing watchlist + alert + Notification primitives,
  RLS-scoped, and **de-duped** (one unread notification per entity per alert).
- A watch toggle on `/entities/{id}` (tracked types only), via the existing primary-watchlist flow.

Pure `entityMomentumMatches` + a live-DB integration test (notify + de-dupe).
