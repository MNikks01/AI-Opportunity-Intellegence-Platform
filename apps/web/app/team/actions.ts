"use server";

import { revalidatePath } from "next/cache";
import {
  inviteMember,
  updateMemberRole,
  removeMember,
  canManageMembers,
  ROLES,
  type Role,
} from "@aioi/database";
import { getDevMembership } from "../lib/dev-org";

/** Every mutation re-checks the caller's role server-side (never trust the client). */
async function requireManage() {
  const m = await getDevMembership();
  if (!canManageMembers(m.role)) throw new Error("You don't have permission to manage the team.");
  return m;
}

function parseRole(value: FormDataEntryValue | null): Role {
  const r = String(value ?? "");
  return (ROLES as string[]).includes(r) ? (r as Role) : "MEMBER";
}

export async function inviteMemberAction(formData: FormData) {
  const { organizationId, userId } = await requireManage();
  const email = String(formData.get("email") ?? "").trim();
  if (!email.includes("@")) return;
  await inviteMember(organizationId, userId, { email, role: parseRole(formData.get("role")) });
  revalidatePath("/team");
}

export async function changeRoleAction(formData: FormData) {
  const { organizationId, userId } = await requireManage();
  const targetUserId = String(formData.get("userId") ?? "");
  if (!targetUserId) return;
  await updateMemberRole(organizationId, userId, targetUserId, parseRole(formData.get("role")));
  revalidatePath("/team");
}

export async function removeMemberAction(formData: FormData) {
  const { organizationId, userId } = await requireManage();
  const targetUserId = String(formData.get("userId") ?? "");
  if (!targetUserId || targetUserId === userId) return; // can't remove yourself
  await removeMember(organizationId, userId, targetUserId);
  revalidatePath("/team");
}
