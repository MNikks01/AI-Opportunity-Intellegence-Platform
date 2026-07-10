import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "./client";
import { getOrCreateReferralCode, getReferralStats, applyReferralCode } from "./referrals";

const enabled = Boolean(process.env.DATABASE_URL);
const orgIds: string[] = [];

async function org(name: string) {
  const o = await prisma.organization.create({
    data: { name, slug: `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` },
  });
  orgIds.push(o.id);
  return o.id;
}

describe.skipIf(!enabled)("referrals (integration)", () => {
  afterAll(async () => {
    for (const id of orgIds) await prisma.organization.delete({ where: { id } }).catch(() => {});
  });

  it("generates a stable code and counts referred orgs", async () => {
    const referrer = await org("ref-a");
    const code = await getOrCreateReferralCode(referrer);
    expect(code).toMatch(/^[0-9A-Z]{8}$/);
    // idempotent
    expect(await getOrCreateReferralCode(referrer)).toBe(code);

    const invitee = await org("ref-b");
    const applied = await applyReferralCode(invitee, code.toLowerCase()); // case-insensitive
    expect(applied).toEqual({ applied: true, code });

    const stats = await getReferralStats(referrer);
    expect(stats.code).toBe(code);
    expect(stats.referredCount).toBe(1);

    const inviteeStats = await getReferralStats(invitee);
    expect(inviteeStats.referredByCode).toBe(code);
  });

  it("rejects invalid, self, and repeat codes", async () => {
    const a = await org("ref-c");
    const codeA = await getOrCreateReferralCode(a);

    expect(await applyReferralCode(a, "NOPE1234")).toEqual({ applied: false, reason: "invalid" });
    expect(await applyReferralCode(a, codeA)).toEqual({ applied: false, reason: "self" });

    const b = await org("ref-d");
    await applyReferralCode(b, codeA);
    // second apply is blocked
    expect((await applyReferralCode(b, codeA)).applied).toBe(false);
  });
});
