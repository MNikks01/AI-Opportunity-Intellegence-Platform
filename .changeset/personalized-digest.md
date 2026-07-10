---
"@aioi/notification-service": minor
---

Personalized weekly digest. A per-org weekly email summarizing movement in THAT org's watched trends
(opportunity + momentum) and new alert matches — distinct from the generic newsletter. New
watchlist-digest email builder + scripts/weekly-digest.ts (weekly deliver-alerts-style workflow,
gated on RESEND_API_KEY, dry-run supported). Composed from existing DB helpers; no migration.
