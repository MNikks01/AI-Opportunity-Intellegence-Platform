/**
 * @aioi/auth
 * Provider-neutral authentication + RBAC + tenant guard. Clerk is confined to ClerkAuthProvider
 * (ADR-0001 D3, ADR-0002); consumers depend only on this interface so the provider is swappable.
 */
export type { Role, AuthContext, AuthRequest, AuthProvider } from "./types";
export { PERMISSIONS, ROLE_PERMISSIONS, type Permission } from "./permissions";
export { can, requirePermission, ForbiddenError, UnauthenticatedError } from "./rbac";
export { tenantGuard, assertOrg } from "./tenant";
export { StubAuthProvider } from "./providers/stub";
export {
  ClerkAuthProvider,
  defaultRoleMap,
  type ClerkClaims,
  type ClerkVerifier,
} from "./providers/clerk";

import type { AuthProvider } from "./types";
import { StubAuthProvider } from "./providers/stub";
import { ClerkAuthProvider, type ClerkVerifier } from "./providers/clerk";

/**
 * Returns the auth provider for the environment. Uses Clerk when a verifier is supplied and Clerk is
 * configured; otherwise the deterministic Stub (dev/test/local). Keep provider selection here so the
 * rest of the app never branches on it.
 */
export function getAuthProvider(opts?: {
  clerkVerifier?: ClerkVerifier;
  env?: NodeJS.ProcessEnv;
}): AuthProvider {
  const env = opts?.env ?? process.env;
  if (opts?.clerkVerifier && env.CLERK_SECRET_KEY) {
    return new ClerkAuthProvider(opts.clerkVerifier);
  }
  return new StubAuthProvider();
}
