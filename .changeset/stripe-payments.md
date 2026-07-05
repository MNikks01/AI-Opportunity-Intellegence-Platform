---
"@aioi/billing": minor
"@aioi/api": minor
---

Stripe payments (B-020 cont.): a `BillingProvider` seam (Stub + Stripe checkout sessions),
`billing.checkout` returning a session URL, and a signature-verified `POST /webhooks/stripe` that syncs
`customer.subscription.*` events to `setPlan`. Inert without Stripe keys (Stub fallback).
