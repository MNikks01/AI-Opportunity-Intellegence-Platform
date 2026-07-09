import { describe, expect, it } from "vitest";
import {
  prisma,
  listMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
  canManageMembers,
} from "./index";

const enabled = Boolean(process.env.DATABASE_URL);

describe("canManageMembers", () => {
  it("allows only owners and admins", () => {
    expect(canManageMembers("OWNER")).toBe(true);
    expect(canManageMembers("ADMIN")).toBe(true);
    expect(canManageMembers("MEMBER")).toBe(false);
    expect(canManageMembers("VIEWER")).toBe(false);
    expect(canManageMembers("BILLING")).toBe(false);
  });
});

describe.skipIf(!enabled)("members (integration)", () => {
  it("invites (idempotently), lists, re-roles, and removes a member", async () => {
    const org = await prisma.organization.create({ data: { name: "T", slug: `t-${Date.now()}` } });
    const email = `invitee-${Date.now()}@x.com`;

    const { created, userId } = await inviteMember(org.id, null, { email, role: "MEMBER" });
    expect(created).toBe(true);

    const invited = (await listMembers(org.id)).find((x) => x.email === email)!;
    expect(invited.role).toBe("MEMBER");
    expect(invited.pending).toBe(true); // synthetic clerkId

    // Inviting the same email again is a no-op.
    expect((await inviteMember(org.id, null, { email, role: "ADMIN" })).created).toBe(false);

    await updateMemberRole(org.id, null, userId, "ADMIN");
    expect((await listMembers(org.id)).find((x) => x.userId === userId)!.role).toBe("ADMIN");

    await removeMember(org.id, null, userId);
    expect((await listMembers(org.id)).some((x) => x.userId === userId)).toBe(false);

    await prisma.organization.delete({ where: { id: org.id } });
    await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  });
});
