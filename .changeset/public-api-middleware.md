---
"@aioi/web": patch
---

Fix: keep the public API reachable without a Clerk session. `proxy.ts` previously ran
`auth.protect()` on **every** route when Clerk keys are present, which also gated `/api/v1/*` and the
Stripe webhook — so anonymous callers (the MCP server, the browser extension, `curl`) were redirected
to sign-in. Now a `createRouteMatcher` carves out `/api/v1(.*)` (the CORS-open read API; per-route
`aioi_…` bearer auth is still optional) and `/api/stripe/webhook` (its own signature check); every other
route still requires authentication. Verified against a Clerk-enabled build: `/api/v1/*` returns 200
JSON anonymously (CORS `*` intact) while app pages still 307 to sign-in.
