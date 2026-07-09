"use server";

import { revalidatePath } from "next/cache";
import {
  inviteMember,
  updateMemberRole,
  removeMember,
  setOrgIntegration,
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

/** Only accept https webhook URLs on the expected Slack/Discord hosts (avoids an open POST relay). */
function validWebhook(url: string, kind: "slack" | "discord"): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return null;
    if (kind === "slack" && !u.hostname.endsWith("slack.com")) return null;
    if (kind === "discord" && !/^(?:.*\.)?discord(?:app)?\.com$/.test(u.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

export async function saveIntegrationAction(formData: FormData) {
  const { organizationId, userId } = await requireManage();
  const slackRaw = String(formData.get("slack") ?? "").trim();
  const discordRaw = String(formData.get("discord") ?? "").trim();
  const patch: {
    slackWebhookUrl?: string | null;
    discordWebhookUrl?: string | null;
    digestEnabled: boolean;
  } = { digestEnabled: formData.get("digestEnabled") === "on" };
  // A non-empty, valid field is saved; empty leaves the existing value unchanged.
  if (slackRaw) {
    const v = validWebhook(slackRaw, "slack");
    if (v) patch.slackWebhookUrl = v;
  }
  if (discordRaw) {
    const v = validWebhook(discordRaw, "discord");
    if (v) patch.discordWebhookUrl = v;
  }
  await setOrgIntegration(organizationId, userId, patch);
  revalidatePath("/team");
}

export async function disconnectIntegrationAction(formData: FormData) {
  const { organizationId, userId } = await requireManage();
  const channel = String(formData.get("channel") ?? "");
  if (channel === "slack")
    await setOrgIntegration(organizationId, userId, { slackWebhookUrl: null });
  else if (channel === "discord")
    await setOrgIntegration(organizationId, userId, { discordWebhookUrl: null });
  revalidatePath("/team");
}
