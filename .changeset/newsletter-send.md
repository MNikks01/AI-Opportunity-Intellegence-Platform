---
"@aioi/notification-service": minor
---

Weekly newsletter send: format the top opportunities as an email (HTML + text, List-Unsubscribe header)
and send to every active subscriber via Resend. New buildNewsletterHtml/buildNewsletterText/sendEmail +
scripts/newsletter.ts + a weekly workflow (gated on RESEND_API_KEY, dry-run supported).
