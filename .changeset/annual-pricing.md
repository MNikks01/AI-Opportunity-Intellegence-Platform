---
"@aioi/billing": minor
"@aioi/web": minor
---

Annual billing option. Paid plans can now be billed annually at 10× the monthly rate (two months
free): shared PLAN_PRICING + monthlyEquivalent in @aioi/billing, a monthly/annual toggle on the
pricing and billing pages, and interval-aware Stripe checkout (STRIPE_PRICE_*_ANNUAL price ids;
interval threaded through CheckoutInput). Entitlements are unchanged by interval.
