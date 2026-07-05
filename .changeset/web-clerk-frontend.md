---
"@aioi/web": minor
---

Frontend Clerk sign-in: conditionally wire `@clerk/nextjs` on `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
(ClerkProvider + header sign-in/UserButton + clerkMiddleware, pass-through without keys). `getDevOrg`
resolves the signed-in user's tenant when Clerk is enabled, else the dev tenant.
