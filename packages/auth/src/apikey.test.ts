import { describe, expect, it, vi } from "vitest";
import {
  ApiKeyAuthProvider,
  ChainAuthProvider,
  StubAuthProvider,
  hashApiKey,
  generateApiKey,
  hashesEqual,
  extractApiKey,
  getAuthProvider,
  can,
  requirePermission,
  ForbiddenError,
  type ApiKeyRecord,
} from "./index";

describe("api key helpers", () => {
  it("hashApiKey is deterministic and hides the raw secret", () => {
    expect(hashApiKey("aioi_abc")).toBe(hashApiKey("aioi_abc"));
    expect(hashApiKey("aioi_abc")).not.toContain("aioi_abc");
    expect(hashApiKey("aioi_abc")).toHaveLength(64); // sha256 hex
  });

  it("generateApiKey returns a prefixed raw + matching hash + display", () => {
    const k = generateApiKey();
    expect(k.raw.startsWith("aioi_")).toBe(true);
    expect(k.hash).toBe(hashApiKey(k.raw));
    expect(k.display.endsWith("…")).toBe(true);
    expect(k.raw).not.toEqual(generateApiKey().raw); // random
  });

  it("hashesEqual compares safely", () => {
    const h = hashApiKey("x");
    expect(hashesEqual(h, h)).toBe(true);
    expect(hashesEqual(h, hashApiKey("y"))).toBe(false);
  });

  it("extractApiKey reads only our-prefixed bearer tokens", () => {
    expect(extractApiKey({ headers: { authorization: "Bearer aioi_xyz" } })).toBe("aioi_xyz");
    expect(extractApiKey({ headers: { Authorization: "Bearer aioi_xyz" } })).toBe("aioi_xyz");
    expect(extractApiKey({ headers: { authorization: "Bearer sk-other" } })).toBeNull();
    expect(extractApiKey({ headers: {} })).toBeNull();
  });
});

describe("ApiKeyAuthProvider", () => {
  const record: ApiKeyRecord = {
    id: "key1",
    organizationId: "org1",
    scopes: ["trends:read", "watchlists:read"],
    revokedAt: null,
  };
  const key = generateApiKey();
  const req = { headers: { authorization: `Bearer ${key.raw}` } };

  it("authenticates a valid key into an org-scoped, scoped context", async () => {
    const lookup = vi.fn().mockResolvedValue(record);
    const ctx = await new ApiKeyAuthProvider(lookup).authenticate(req);
    expect(lookup).toHaveBeenCalledWith(key.hash);
    expect(ctx).toMatchObject({
      userId: "apikey:key1",
      orgId: "org1",
      kind: "apikey",
      scopes: ["trends:read", "watchlists:read"],
    });
  });

  it("calls onUsed for metering", async () => {
    const onUsed = vi.fn();
    await new ApiKeyAuthProvider(() => Promise.resolve(record), onUsed).authenticate(req);
    expect(onUsed).toHaveBeenCalledWith("key1");
  });

  it("denies unknown, revoked, and non-key requests", async () => {
    expect(await new ApiKeyAuthProvider(() => Promise.resolve(null)).authenticate(req)).toBeNull();
    expect(
      await new ApiKeyAuthProvider(() =>
        Promise.resolve({ ...record, revokedAt: new Date() }),
      ).authenticate(req),
    ).toBeNull();
    expect(
      await new ApiKeyAuthProvider(() => Promise.resolve(record)).authenticate({ headers: {} }),
    ).toBeNull();
  });
});

describe("scope-aware RBAC", () => {
  const apiCtx = {
    userId: "apikey:k",
    orgId: "o",
    role: "VIEWER" as const,
    scopes: ["trends:read"] as const,
  };

  it("grants in-scope and denies out-of-scope regardless of nominal role", () => {
    expect(can(apiCtx, "trends:read")).toBe(true);
    expect(can(apiCtx, "watchlists:read")).toBe(false); // not in scopes even though VIEWER can read
    expect(() => requirePermission(apiCtx, "watchlists:read")).toThrow(ForbiddenError);
  });

  it("a key can never exceed its scopes even with a privileged role", () => {
    const privileged = { ...apiCtx, role: "OWNER" as const, scopes: ["trends:read"] as const };
    expect(can(privileged, "org:delete")).toBe(false); // OWNER, but scope-limited
  });
});

describe("provider chaining", () => {
  const record: ApiKeyRecord = {
    id: "k",
    organizationId: "o",
    scopes: ["trends:read"],
    revokedAt: null,
  };
  const key = generateApiKey();

  it("ChainAuthProvider returns the first non-null context", async () => {
    const chain = new ChainAuthProvider([
      new ApiKeyAuthProvider(() => Promise.resolve(record)),
      new StubAuthProvider(),
    ]);
    const withKey = await chain.authenticate({ headers: { authorization: `Bearer ${key.raw}` } });
    expect(withKey?.kind).toBe("apikey");
    const withoutKey = await chain.authenticate({ headers: {} });
    expect(withoutKey?.role).toBe("OWNER"); // falls through to the stub session
  });

  it("getAuthProvider chains api-key auth ahead of the session when a lookup is given", async () => {
    const provider = getAuthProvider({ apiKeyLookup: () => Promise.resolve(record) });
    const ctx = await provider.authenticate({ headers: { authorization: `Bearer ${key.raw}` } });
    expect(ctx).toMatchObject({ orgId: "o", kind: "apikey" });
  });
});
