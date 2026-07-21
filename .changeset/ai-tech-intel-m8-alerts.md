---
"@aioi/database": minor
"@aioi/notification-service": minor
"@aioi/validation": minor
"@aioi/ai-service": patch
---

AI & Tech Intelligence vertical — M8 (news alerts). Adds a `PUSH` alert channel, Telegram delivery, and
region/category/model news subscriptions:

- migration: `PUSH` on `AlertChannel`; `telegramBotToken`/`telegramChatId` on `OrgIntegration`; and the
  `app_orgs_watching_topic` SECURITY DEFINER function (cross-tenant topic discovery, mirroring
  `app_orgs_watching_trend`).
- notification-service: `formatTelegramDigest` + `postTelegram` (Bot API `sendMessage`, HTML), wired into
  `deliverDigest` alongside Slack/Discord.
- database: TOPIC-subscription matcher — a signal's region/category/model map to topic ids
  (`region:US`, `category:ai-models`, `model:llama`) via `newsTopicTargets`; `evaluateSignalAllOrgs`
  fans out cross-tenant and `evaluateSignalForOrg` writes a deduped in-app Notification per org.
- ai-service: the analysis pass fires the news-alert fan-out (best-effort) after persisting an analysis.
  Design: AI_TECH_INTELLIGENCE_MODULE.md; ADR-0009.
