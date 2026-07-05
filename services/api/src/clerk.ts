/**
 * Clerk integration (B-014/B-015): a real session-token verifier for the auth adapter, and a webhook
 * handler that provisions a tenant on sign-up. Both are inert without config (CLERK_SECRET_KEY /
 * CLERK_WEBHOOK_SECRET) so dev/CI keep using the StubAuthProvider and the pipeline stays green.
 */
import { verifyToken } from "@clerk/backend";
import { bootstrapUser } from "@aioi/database";
import type { AuthRequest, ClerkClaims } from "@aioi/auth";

/** Verify a Clerk session JWT from the Authorization header → claims. Null when unconfigured/invalid. */
export async function clerkVerifier(req: AuthRequest): Promise<ClerkClaims | null> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) return null;

  const header = req.headers["authorization"] ?? req.headers["Authorization"];
  const value = Array.isArray(header) ? header[0] : header;
  const token = value?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  try {
    const claims = (await verifyToken(token, { secretKey })) as Record<string, unknown>;
    const org = (claims.o ?? {}) as { id?: string; rol?: string };
    return {
      sub: String(claims.sub),
      org_id: (claims.org_id as string | undefined) ?? org.id,
      org_role: (claims.org_role as string | undefined) ?? org.rol,
      email: claims.email as string | undefined,
    };
  } catch {
    return null; // invalid/expired token → unauthenticated
  }
}

/** Minimal shape of a Clerk `user.*` webhook event. */
export interface ClerkUserEvent {
  type: string;
  data: {
    id: string;
    email_addresses?: Array<{ email_address: string }>;
    first_name?: string | null;
    last_name?: string | null;
  };
}

/** Provision (or refresh) a tenant on `user.created`/`user.updated`. Idempotent via bootstrapUser. */
export async function handleClerkUserEvent(evt: ClerkUserEvent): Promise<void> {
  if (evt.type !== "user.created" && evt.type !== "user.updated") return;
  const email = evt.data.email_addresses?.[0]?.email_address ?? `${evt.data.id}@users.noreply`;
  const name = [evt.data.first_name, evt.data.last_name].filter(Boolean).join(" ") || undefined;
  await bootstrapUser({ clerkId: evt.data.id, email, name });
}
