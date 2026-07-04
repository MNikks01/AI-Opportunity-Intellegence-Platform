---
"@aioi/database": minor
"@aioi/api": minor
"@aioi/validation": minor
---

Alerts engine (B-017): a `Notification` model, org-scoped alert + notification repositories, a pure
trigger matcher (`NEW_TREND`/`SCORE_CROSSES`), and `evaluateTrendForOrg` that writes in-app
notifications for matched alerts. Adds `alerts`/`notifications` tRPC routers (protected + RBAC) and RLS
on `Alert` (EXISTS-via-parent) and `Notification` (direct-org).
