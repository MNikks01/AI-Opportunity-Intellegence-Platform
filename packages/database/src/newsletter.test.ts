import { describe, expect, it } from "vitest";
import { prisma, subscribe, unsubscribe, listActiveSubscribers, countSubscribers } from "./index";

const enabled = Boolean(process.env.DATABASE_URL);

describe.skipIf(!enabled)("newsletter subscribers (integration)", () => {
  it("subscribes (idempotent, case-insensitive), lists, and unsubscribes by token", async () => {
    const email = `sub-${Date.now()}@Example.com`;
    const lower = email.toLowerCase();

    expect((await subscribe(email)).created).toBe(true);
    expect((await subscribe(email.toUpperCase())).created).toBe(false); // same address, normalized

    const active = await listActiveSubscribers();
    const row = active.find((s) => s.email === lower)!;
    expect(row).toBeTruthy();
    expect(row.token).toBeTruthy();

    const before = await countSubscribers();
    expect(await unsubscribe(row.token)).toBe(lower);
    expect(await countSubscribers()).toBe(before - 1);
    expect((await listActiveSubscribers()).some((s) => s.email === lower)).toBe(false);

    // Re-subscribing reactivates.
    expect((await subscribe(email)).created).toBe(false);
    expect((await listActiveSubscribers()).some((s) => s.email === lower)).toBe(true);

    expect(await unsubscribe("bogus-token")).toBeNull();

    await prisma.subscriber.delete({ where: { email: lower } });
  });
});
