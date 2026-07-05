import { clerkMiddleware } from "@clerk/nextjs/server";

// When Clerk is configured, require authentication for every app route (unauthenticated → sign-in).
// Without keys, a pass-through so dev/CI run unchanged.
const enabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default enabled
  ? clerkMiddleware(async (auth) => {
      await auth.protect();
    })
  : function middleware() {};

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
