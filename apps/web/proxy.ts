// Next.js 16 request middleware lives in `proxy.ts` (the former `middleware.ts` convention). Clerk
// hooks into this file, so it must be named `proxy.ts` for `clerkMiddleware()` to be detected.
import { clerkMiddleware } from "@clerk/nextjs/server";

// When Clerk is configured, require authentication for every app route (unauthenticated → sign-in).
// Without keys, a pass-through so dev/CI run unchanged.
const enabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default enabled
  ? clerkMiddleware(async (auth) => {
      await auth.protect();
    })
  : function proxy() {};

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
