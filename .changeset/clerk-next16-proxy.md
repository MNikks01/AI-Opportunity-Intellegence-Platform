---
"@aioi/web": patch
---

Fix Clerk auth on Next.js 16: rename the request middleware `middleware.ts` → `proxy.ts` (Next 16's new
convention) so `clerkMiddleware()` is detected — resolves "auth() was called but Clerk can't detect
usage of clerkMiddleware()" and the resulting 404. Also switch the header `<SignInButton>` to Clerk's
default button (the custom child tripped a "multiple children" error).
