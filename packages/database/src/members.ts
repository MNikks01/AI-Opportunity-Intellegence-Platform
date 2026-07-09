/**
 * Team members & roles (B-032). Organization/Membership/User have no RLS, so these run on the app
 * connection directly. Every mutation is RBAC-gated at the call site (canManageMembers) and audited.
 * An invited-but-not-yet-signed-in user gets a synthetic `pending:<email>` clerkId; when they sign in
 * through Clerk, bootstrap links their real account by email.
 */
import type { $Enums } from "@prisma/client";
import { entitlementsFor, withinLimit, PlanLimitError } from "@aioi/billing";
import { prisma } from "./client";
import { writeAuditLog } from "./audit";
import { getPlan } from "./subscription";

/** Team members (including pending invites) on an org — counts against the plan's seat limit. */
export function countMembers(orgId: string): Promise<number> {
  return prisma.membership.count({ where: { organizationId: orgId } });
}

export type Role = $Enums.Role;
export const ROLES: Role[] = ["OWNER", "ADMIN", "MEMBER", "BILLING", "VIEWER"];

const MANAGE_ROLES: Role[] = ["OWNER", "ADMIN"];
/** Only owners and admins may manage the team. */
export const canManageMembers = (role: Role): boolean => MANAGE_ROLES.includes(role);

export interface Member {
  userId: string;
  email: string;
  name: string | null;
  role: Role;
  /** Invited but not yet signed in (synthetic clerkId). */
  pending: boolean;
  joinedAt: Date;
}

export async function listMembers(orgId: string): Promise<Member[]> {
  const rows = await prisma.membership.findMany({
    where: { organizationId: orgId },
    include: { user: { select: { email: true, name: true, clerkId: true } } },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((m) => ({
    userId: m.userId,
    email: m.user.email,
    name: m.user.name,
    role: m.role,
    pending: m.user.clerkId.startsWith("pending:"),
    joinedAt: m.createdAt,
  }));
}

/** Add a member by email (idempotent). Creates a pending user if the email is new. */
export async function inviteMember(
  orgId: string,
  actorUserId: string | null,
  input: { email: string; role: Role },
): Promise<{ created: boolean; userId: string }> {
  const email = input.email.trim().toLowerCase();
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, clerkId: `pending:${email}` },
    update: {},
  });
  const existing = await prisma.membership.findUnique({
    where: { organizationId_userId: { organizationId: orgId, userId: user.id } },
  });
  if (existing) return { created: false, userId: user.id }; // idempotent re-invite; no new seat

  // Enforce the plan's seat limit (B-020/B-032). Pending invites occupy a seat.
  const seats = entitlementsFor(await getPlan(orgId)).maxSeats;
  const used = await prisma.membership.count({ where: { organizationId: orgId } });
  if (!withinLimit(seats, used)) throw new PlanLimitError("seats");

  await prisma.membership.create({
    data: { organizationId: orgId, userId: user.id, role: input.role },
  });
  await writeAuditLog(orgId, {
    actorUserId,
    action: "member.invite",
    targetType: "membership",
    targetId: user.id,
    metadata: { email, role: input.role },
  });
  return { created: true, userId: user.id };
}

export async function updateMemberRole(
  orgId: string,
  actorUserId: string | null,
  userId: string,
  role: Role,
): Promise<void> {
  await prisma.membership.update({
    where: { organizationId_userId: { organizationId: orgId, userId } },
    data: { role },
  });
  await writeAuditLog(orgId, {
    actorUserId,
    action: "member.role",
    targetType: "membership",
    targetId: userId,
    metadata: { role },
  });
}

export async function removeMember(
  orgId: string,
  actorUserId: string | null,
  userId: string,
): Promise<void> {
  await prisma.membership.delete({
    where: { organizationId_userId: { organizationId: orgId, userId } },
  });
  await writeAuditLog(orgId, {
    actorUserId,
    action: "member.remove",
    targetType: "membership",
    targetId: userId,
  });
}
