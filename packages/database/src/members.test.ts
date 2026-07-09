import { describe, expect, it } from "vitest";
import { PlanLimitError } from "@aioi/billing";
import {
  prisma,
  listMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
  canManageMembers,
  countMembers,
  setPlan,
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

  it("enforces the plan's seat limit; upgrading lifts it", async () => {
    const org = await prisma.organization.create({ data: { name: "S", slug: `s-${Date.now()}` } });
    const uids: string[] = [];

    // FREE = 1 seat. First invite fills it; the second is blocked.
    const first = await inviteMember(org.id, null, {
      email: `a-${Date.now()}@x.com`,
      role: "MEMBER",
    });
    uids.push(first.userId);
    expect(await countMembers(org.id)).toBe(1);
    await expect(
      inviteMember(org.id, null, { email: `b-${Date.now()}@x.com`, role: "MEMBER" }),
    ).rejects.toBeInstanceOf(PlanLimitError);

    // TEAM = 25 seats — the same invite now succeeds.
    await setPlan(org.id, "TEAM");
    const ok = await inviteMember(org.id, null, { email: `c-${Date.now()}@x.com`, role: "MEMBER" });
    uids.push(ok.userId);
    expect(ok.created).toBe(true);

    await prisma.organization.delete({ where: { id: org.id } });
    for (const id of uids) await prisma.user.delete({ where: { id } }).catch(() => {});
  });
});
