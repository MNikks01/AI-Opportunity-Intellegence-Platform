import { describe, expect, it } from "vitest";
import {
  can,
  requirePermission,
  ForbiddenError,
  UnauthenticatedError,
  tenantGuard,
  assertOrg,
  StubAuthProvider,
  ClerkAuthProvider,
  defaultRoleMap,
  type AuthContext,
  type Role,
  type Permission,
} from "./index";

const ctx = (role: Role): AuthContext => ({ userId: "u", orgId: "o", role });

describe("RBAC permission matrix", () => {
  // Representative expectations from the auth skill table.
  const cases: Array<[Permission, Record<Role, boolean>]> = [
    ["trends:read", { OWNER: true, ADMIN: true, MEMBER: true, BILLING: true, VIEWER: true }],
    ["watchlists:write", { OWNER: true, ADMIN: true, MEMBER: true, BILLING: false, VIEWER: false }],
    ["reports:write", { OWNER: true, ADMIN: true, MEMBER: true, BILLING: false, VIEWER: false }],
    [
      "org:members:manage",
      { OWNER: true, ADMIN: true, MEMBER: false, BILLING: false, VIEWER: false },
    ],
    ["apikeys:manage", { OWNER: true, ADMIN: true, MEMBER: false, BILLING: false, VIEWER: false }],
    ["billing:manage", { OWNER: true, ADMIN: false, MEMBER: false, BILLING: true, VIEWER: false }],
    ["org:delete", { OWNER: true, ADMIN: false, MEMBER: false, BILLING: false, VIEWER: false }],
  ];

  for (const [perm, expected] of cases) {
    for (const role of Object.keys(expected) as Role[]) {
      it(`${role} ${expected[role] ? "can" : "cannot"} ${perm}`, () => {
        expect(can(ctx(role), perm)).toBe(expected[role]);
      });
    }
  }

  it("denies by default for a null context", () => {
    expect(can(null, "trends:read")).toBe(false);
  });
});

describe("requirePermission", () => {
  it("passes when the role has the permission", () => {
    expect(() => requirePermission(ctx("ADMIN"), "reports:write")).not.toThrow();
  });
  it("throws ForbiddenError when the role lacks it", () => {
    expect(() => requirePermission(ctx("VIEWER"), "reports:write")).toThrow(ForbiddenError);
  });
  it("throws UnauthenticatedError when there is no context", () => {
    expect(() => requirePermission(null, "trends:read")).toThrow(UnauthenticatedError);
  });
  it("errors carry a machine code", () => {
    try {
      requirePermission(ctx("VIEWER"), "org:delete");
    } catch (e) {
      expect((e as ForbiddenError).code).toBe("FORBIDDEN");
      expect((e as ForbiddenError).permission).toBe("org:delete");
    }
  });
});

describe("tenant guard", () => {
  it("returns the context when org-scoped", () => {
    expect(tenantGuard(ctx("MEMBER")).orgId).toBe("o");
  });
  it("throws when unauthenticated / no org", () => {
    expect(() => tenantGuard(null)).toThrow(UnauthenticatedError);
    expect(() => tenantGuard({ userId: "u", orgId: "", role: "OWNER" })).toThrow(
      UnauthenticatedError,
    );
  });
  it("assertOrg rejects a mismatched client-supplied org id", () => {
    expect(() => assertOrg(ctx("OWNER"), "other-org")).toThrow(UnauthenticatedError);
    expect(() => assertOrg(ctx("OWNER"), "o")).not.toThrow();
    expect(() => assertOrg(ctx("OWNER"), undefined)).not.toThrow();
  });
});

describe("providers", () => {
  it("StubAuthProvider returns a dev OWNER context", async () => {
    const c = await new StubAuthProvider().authenticate({ headers: {} });
    expect(c).toMatchObject({ role: "OWNER", orgId: "dev-org" });
  });

  it("ClerkAuthProvider maps claims -> context and requires an org", async () => {
    const provider = new ClerkAuthProvider((_req) =>
      Promise.resolve({ sub: "user_1", org_id: "org_1", org_role: "org:admin", email: "a@b.co" }),
    );
    const c = await provider.authenticate({ headers: {} });
    expect(c).toEqual({ userId: "user_1", orgId: "org_1", role: "ADMIN", email: "a@b.co" });
  });

  it("ClerkAuthProvider returns null without an active org", async () => {
    const provider = new ClerkAuthProvider((_req) => Promise.resolve({ sub: "user_1" }));
    expect(await provider.authenticate({ headers: {} })).toBeNull();
  });

  it("defaultRoleMap maps Clerk roles", () => {
    expect(defaultRoleMap("org:admin")).toBe("ADMIN");
    expect(defaultRoleMap("owner")).toBe("OWNER");
    expect(defaultRoleMap("org:member")).toBe("MEMBER");
    expect(defaultRoleMap(undefined)).toBe("MEMBER");
  });
});
