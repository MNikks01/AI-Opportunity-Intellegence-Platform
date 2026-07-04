/**
 * @aioi/auth
 * Provider-neutral authentication + RBAC + tenant guard. Clerk is confined to ClerkAuthProvider
 * (ADR-0001 D3, ADR-0002); consumers depend only on this interface so the provider is swappable.
 */
export type { Role, AuthKind, AuthContext, AuthRequest, AuthProvider } from "./types";
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
export {
  ApiKeyAuthProvider,
  hashApiKey,
  generateApiKey,
  hashesEqual,
  extractApiKey,
  type ApiKeyRecord,
  type ApiKeyLookup,
} from "./providers/apikey";
export { ChainAuthProvider } from "./providers/chain";

import type { AuthProvider } from "./types";
import { StubAuthProvider } from "./providers/stub";
import { ClerkAuthProvider, type ClerkVerifier } from "./providers/clerk";
import { ApiKeyAuthProvider, type ApiKeyLookup } from "./providers/apikey";
import { ChainAuthProvider } from "./providers/chain";

/**
 * Returns the auth provider for the environment. When an API-key lookup is supplied, keys are tried
 * first, then the session provider: Clerk (verifier + key configured) or the deterministic Stub
 * (dev/test/local). Keep provider selection here so the rest of the app never branches on it.
 */
export function getAuthProvider(opts?: {
  clerkVerifier?: ClerkVerifier;
  apiKeyLookup?: ApiKeyLookup;
  env?: NodeJS.ProcessEnv;
}): AuthProvider {
  const env = opts?.env ?? process.env;
  const session: AuthProvider =
    opts?.clerkVerifier && env.CLERK_SECRET_KEY
      ? new ClerkAuthProvider(opts.clerkVerifier)
      : new StubAuthProvider();
  if (opts?.apiKeyLookup) {
    return new ChainAuthProvider([new ApiKeyAuthProvider(opts.apiKeyLookup), session]);
  }
  return session;
}
