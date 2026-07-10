/**
 * Referral / affiliate loop (B-037). Each org has a shareable `referralCode`; a new org that applies a
 * code records it as `referredByCode`, so the referrer can see how many orgs joined via their link.
 * Organization has no RLS (global table), so these run on the app connection directly.
 */
import { randomUUID } from "node:crypto";
import { prisma } from "./client";

/** A short, URL-safe, uppercase code, e.g. "K3P9QX2M". */
function newCode(): string {
  return randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
}

/** The org's referral code, generating + persisting one on first call (retries on the rare collision). */
export async function getOrCreateReferralCode(orgId: string): Promise<string> {
  const existing = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { referralCode: true },
  });
  if (existing?.referralCode) return existing.referralCode;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    try {
      await prisma.organization.update({ where: { id: orgId }, data: { referralCode: code } });
      return code;
    } catch {
      // unique collision — try another code
    }
  }
  throw new Error("could not allocate a referral code");
}

export interface ReferralStats {
  code: string;
  /** Orgs that joined using this org's code. */
  referredCount: number;
  /** The code that referred this org, if any. */
  referredByCode: string | null;
}

/** The org's referral code + how many orgs it has referred + whether it was itself referred. */
export async function getReferralStats(orgId: string): Promise<ReferralStats> {
  const code = await getOrCreateReferralCode(orgId);
  const [referredCount, org] = await Promise.all([
    prisma.organization.count({ where: { referredByCode: code, deletedAt: null } }),
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { referredByCode: true },
    }),
  ]);
  return { code, referredCount, referredByCode: org?.referredByCode ?? null };
}

export type ApplyReferralResult =
  { applied: true; code: string } | { applied: false; reason: "invalid" | "self" | "already" };

/**
 * Apply a referral code to an org (set `referredByCode`). One-shot: fails if the org already has one,
 * if the code is its own, or if no org owns that code. Case-insensitive; codes are stored uppercase.
 */
export async function applyReferralCode(
  orgId: string,
  rawCode: string,
): Promise<ApplyReferralResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { applied: false, reason: "invalid" };

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { referralCode: true, referredByCode: true },
  });
  if (!org) return { applied: false, reason: "invalid" };
  if (org.referredByCode) return { applied: false, reason: "already" };
  if (org.referralCode && org.referralCode === code) return { applied: false, reason: "self" };

  const referrer = await prisma.organization.findUnique({
    where: { referralCode: code },
    select: { id: true },
  });
  if (!referrer || referrer.id === orgId) return { applied: false, reason: "invalid" };

  await prisma.organization.update({ where: { id: orgId }, data: { referredByCode: code } });
  return { applied: true, code };
}
