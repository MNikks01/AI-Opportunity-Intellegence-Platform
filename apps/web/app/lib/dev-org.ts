import { cache } from "react";
import { bootstrapUser } from "@aioi/database";

/** Clerk is active only when a publishable key is configured (else the dev tenant + CI stay green). */
export const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

/**
 * Resolve the current org/workspace. With Clerk configured, use the signed-in user (provisioning their
 * tenant via `bootstrapUser`, idempotent). Otherwise — and when nobody is signed in — fall back to a
 * single demo tenant so the app is usable in dev. Request-cached. (Name kept for call-site stability.)
 */
export const getDevOrg = cache(
  async (): Promise<{
    organizationId: string;
    workspaceId: string | null;
  }> => {
    if (clerkEnabled) {
      // Sign-in is enforced by middleware; resolve the signed-in user (no dev fallback in auth mode).
      const resolved = await resolveClerkOrg();
      if (!resolved) throw new Error("Unauthenticated");
      return resolved;
    }
    const r = await bootstrapUser({
      clerkId: "dev-user",
      email: "dev@aioi.local",
      name: "Dev User",
    });
    return { organizationId: r.organizationId, workspaceId: r.workspaceId };
  },
);

async function resolveClerkOrg(): Promise<{
  organizationId: string;
  workspaceId: string | null;
} | null> {
  const { auth, currentUser } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? `${userId}@users.noreply`;
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || undefined;
  const r = await bootstrapUser({ clerkId: userId, email, name });
  return { organizationId: r.organizationId, workspaceId: r.workspaceId };
}
