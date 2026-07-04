/**
 * Tries each provider in order and returns the first non-null context. Lets a single entry point
 * accept API keys (machine clients) and sessions (browser) without callers branching on the mechanism.
 */
import type { AuthContext, AuthProvider, AuthRequest } from "../types";

export class ChainAuthProvider implements AuthProvider {
  readonly name = "chain";
  constructor(private readonly providers: readonly AuthProvider[]) {}

  async authenticate(req: AuthRequest): Promise<AuthContext | null> {
    for (const provider of this.providers) {
      const ctx = await provider.authenticate(req);
      if (ctx) return ctx;
    }
    return null;
  }
}
