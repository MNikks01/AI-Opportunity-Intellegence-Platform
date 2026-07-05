"use server";

import { revalidatePath } from "next/cache";
import { generateDailyBrief } from "@aioi/database";
import { getDevOrg } from "../lib/dev-org";

export async function generateBriefAction(): Promise<void> {
  const { organizationId } = await getDevOrg();
  await generateDailyBrief(organizationId);
  revalidatePath("/briefs");
}
