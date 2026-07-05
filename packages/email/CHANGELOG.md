# @aioi/email

## 0.1.0

### Minor Changes

- 0d328db: Email delivery: new `@aioi/email` (EmailProvider seam — Stub outbox + Resend — plus brief/alert
  templates). The scheduler's daily-brief job now emails each org's members (`listOrgMemberEmails`), via
  the Stub outbox offline and Resend when `RESEND_API_KEY`+`EMAIL_FROM` are set.
