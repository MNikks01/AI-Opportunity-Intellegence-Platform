---
"@aioi/notification-service": minor
---

Slack/Discord digest delivery: format the daily brief as a Slack Block Kit / Discord markdown message
and POST it to a webhook (best-effort, opt-in). New `formatSlackDigest`/`formatDiscordDigest`/`deliverDigest`;
the refresh cron delivers when SLACK_WEBHOOK_URL / DISCORD_WEBHOOK_URL is set.
