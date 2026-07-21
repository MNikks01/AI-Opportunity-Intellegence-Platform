# @aioi/notification-service

## 0.4.0

### Minor Changes

- 46cad64: AI & Tech Intelligence vertical — M8 (news alerts). Adds a `PUSH` alert channel, Telegram delivery, and
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

### Patch Changes

- Updated dependencies [a318f3e]
- Updated dependencies [09d03cb]
- Updated dependencies [538c880]
- Updated dependencies [46cad64]
  - @aioi/shared@0.3.0
  - @aioi/validation@0.5.0

## 0.3.1

### Patch Changes

- Updated dependencies [b6bf357]
  - @aioi/validation@0.4.0

## 0.3.0

### Minor Changes

- eb1fc88: Alert email delivery. EMAIL-channel alert notifications are now delivered by email: a new
  Notification.emailedAt column + listPendingEmailNotifications / markNotificationsEmailed helpers, an
  alert-email builder in the notification service, and a `scripts/deliver-alerts.ts` job (hourly
  `deliver-alerts.yml` workflow, gated on RESEND_API_KEY, dry-run supported). Closes the loop on the
  alert channel users could already select.
- 48003f9: Personalized weekly digest. A per-org weekly email summarizing movement in THAT org's watched trends
  (opportunity + momentum) and new alert matches — distinct from the generic newsletter. New
  watchlist-digest email builder + scripts/weekly-digest.ts (weekly deliver-alerts-style workflow,
  gated on RESEND_API_KEY, dry-run supported). Composed from existing DB helpers; no migration.

## 0.2.0

### Minor Changes

- 4f0e6f0: Weekly newsletter send: format the top opportunities as an email (HTML + text, List-Unsubscribe header)
  and send to every active subscriber via Resend. New buildNewsletterHtml/buildNewsletterText/sendEmail +
  scripts/newsletter.ts + a weekly workflow (gated on RESEND_API_KEY, dry-run supported).

## 0.1.0

### Minor Changes

- ef16674: Slack/Discord digest delivery: format the daily brief as a Slack Block Kit / Discord markdown message
  and POST it to a webhook (best-effort, opt-in). New `formatSlackDigest`/`formatDiscordDigest`/`deliverDigest`;
  the refresh cron delivers when SLACK_WEBHOOK_URL / DISCORD_WEBHOOK_URL is set.

## 0.0.5

### Patch Changes

- Updated dependencies [746979c]
  - @aioi/shared@0.2.0

## 0.0.4

### Patch Changes

- Updated dependencies [bdc16f0]
  - @aioi/validation@0.3.0

## 0.0.3

### Patch Changes

- Updated dependencies [aa401cc]
  - @aioi/shared@0.1.0

## 0.0.2

### Patch Changes

- Updated dependencies [c10faf2]
  - @aioi/validation@0.2.0

## 0.0.1

### Patch Changes

- Updated dependencies [5d583c8]
- Updated dependencies [0634493]
  - @aioi/validation@0.1.0
