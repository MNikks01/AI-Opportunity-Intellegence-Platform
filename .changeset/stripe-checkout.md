---
"@aioi/web": minor
"@aioi/billing": minor
"@aioi/database": minor
---

Stripe checkout & webhook for self-serve upgrades. The `/billing` "Upgrade to Pro" button opens
Stripe Checkout (or applies Pro directly in test mode); a signature-verified webhook is the source
of truth for plan changes, mapping subscription events → plan via pure, unit-tested helpers and
persisting the Stripe ids. Manage/cancel via the Stripe Billing Portal. Falls back to the offline
Stub when STRIPE_SECRET_KEY / STRIPE_PRICE_PRO are unset.
