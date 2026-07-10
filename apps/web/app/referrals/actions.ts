"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { applyReferralCode } from "@aioi/database";
import { getDevOrg } from "../lib/dev-org";

/** Apply a referral code to the current org (one-shot). Surfaces the outcome via a query param. */
export async function applyReferralAction(formData: FormData): Promise<void> {
  const { organizationId } = await getDevOrg();
  const code = String(formData.get("code") ?? "").trim();
  if (!code) redirect("/referrals?applied=invalid");
  const res = await applyReferralCode(organizationId, code);
  revalidatePath("/referrals");
  redirect(`/referrals?applied=${res.applied ? "ok" : res.reason}`);
}
