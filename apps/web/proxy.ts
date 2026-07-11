// Next.js 16 request middleware lives in `proxy.ts` (the former `middleware.ts` convention). Clerk
// hooks into this file, so it must be named `proxy.ts` for `clerkMiddleware()` to be detected.
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// When Clerk is configured, require authentication for every app route (unauthenticated → sign-in).
// Without keys, a pass-through so dev/CI run unchanged.
const enabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

// Routes that must stay reachable without a Clerk session:
//   - `/api/v1/*` — the public read API (CORS-open; auth is optional via an `aioi_…` bearer key,
//     enforced per-route by `apiAuth`, not by Clerk). The MCP server + browser extension depend on this.
//   - `/api/stripe/webhook` — Stripe posts here with no session; authenticity is its own signature check.
const isPublicRoute = createRouteMatcher(["/api/v1(.*)", "/api/stripe/webhook"]);

export default enabled
  ? clerkMiddleware(async (auth, req) => {
      if (!isPublicRoute(req)) await auth.protect();
    })
  : function proxy() {};

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
