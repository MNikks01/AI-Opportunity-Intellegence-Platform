---
"@aioi/database": minor
"@aioi/web": minor
---

Per-org digest config: an OrgIntegration model + a "Digest delivery" section on /team to connect a
Slack/Discord incoming webhook and toggle the daily digest. RBAC-gated, audited, webhook host-validated;
the cron delivers to each org's configured webhook (env is the fallback). New getOrgIntegration/setOrgIntegration.
