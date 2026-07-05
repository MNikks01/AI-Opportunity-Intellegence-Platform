import { clerkMiddleware } from "@clerk/nextjs/server";

// Clerk middleware only when configured; a pass-through otherwise so dev/CI (no keys) run unchanged.
const enabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default enabled ? clerkMiddleware() : function middleware() {};

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
