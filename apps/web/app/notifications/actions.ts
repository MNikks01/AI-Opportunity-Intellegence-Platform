"use server";

import { revalidatePath } from "next/cache";
import { markNotificationRead, markAllNotificationsRead } from "@aioi/database";
import { getDevOrg } from "../lib/dev-org";

export async function markReadAction(formData: FormData): Promise<void> {
  const { organizationId } = await getDevOrg();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await markNotificationRead(organizationId, id);
  revalidatePath("/notifications");
}

export async function markAllReadAction(): Promise<void> {
  const { organizationId } = await getDevOrg();
  await markAllNotificationsRead(organizationId);
  revalidatePath("/notifications");
}
