/**
 * Deterministic dev/test auth provider — returns a fixed context (default OWNER of a dev org) so the
 * app and tests run without Clerk keys. NOT for production. Mirrors the ai-sdk StubProvider pattern.
 */
import type { AuthContext, AuthProvider, AuthRequest } from "../types";

const DEFAULT_CONTEXT: AuthContext = {
  userId: "dev-user",
  orgId: "dev-org",
  role: "OWNER",
  email: "dev@aioi.local",
};

export class StubAuthProvider implements AuthProvider {
  readonly name = "stub";
  constructor(private readonly ctx: AuthContext | null = DEFAULT_CONTEXT) {}

  authenticate(_req: AuthRequest): Promise<AuthContext | null> {
    return Promise.resolve(this.ctx);
  }
}
