"use server";

import { revalidatePath } from "next/cache";
import { setPlan } from "@aioi/database";
import { getDevOrg } from "../lib/dev-org";

export async function setPlanAction(formData: FormData): Promise<void> {
  const { organizationId } = await getDevOrg();
  const plan = String(formData.get("plan") ?? "");
  if (plan !== "FREE" && plan !== "PRO") return;
  await setPlan(organizationId, plan);
  revalidatePath("/billing");
}
