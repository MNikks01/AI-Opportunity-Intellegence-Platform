import { cache } from "react";
import { bootstrapUser } from "@aioi/database";

/**
 * Dev stand-in for an authenticated session. Real auth (Clerk → `bootstrapUser` on `user.created`)
 * lands with the Clerk verifier; until then the web app resolves a single demo tenant so the
 * tenant-scoped features (watchlists) are exercisable end-to-end. Idempotent + request-cached.
 */
export const getDevOrg = cache(async () => {
  const r = await bootstrapUser({
    clerkId: "dev-user",
    email: "dev@aioi.local",
    name: "Dev User",
  });
  return { organizationId: r.organizationId, workspaceId: r.workspaceId };
});
