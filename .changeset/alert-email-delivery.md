---
"@aioi/database": minor
"@aioi/notification-service": minor
---

Alert email delivery. EMAIL-channel alert notifications are now delivered by email: a new
Notification.emailedAt column + listPendingEmailNotifications / markNotificationsEmailed helpers, an
alert-email builder in the notification service, and a `scripts/deliver-alerts.ts` job (hourly
`deliver-alerts.yml` workflow, gated on RESEND_API_KEY, dry-run supported). Closes the loop on the
alert channel users could already select.
