# @aioi/notification-service

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
