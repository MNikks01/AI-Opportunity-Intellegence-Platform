---
"@aioi/api": minor
---

Clerk verifier + sign-up webhook (B-014/B-015): the API verifies real Clerk session JWTs via the auth
adapter when CLERK_SECRET_KEY is set (else the Stub), and a Svix-verified POST /webhooks/clerk
provisions a tenant on user.created (bootstrapUser). buildServer is now async (raw body for signatures).
