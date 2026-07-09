/**
 * Newsletter subscribers (B-035). The top-of-funnel list — global (not org-scoped). Unsubscribe uses a
 * per-subscriber token embedded in the email link (no login required). No RLS; runs on the app connection.
 */
import { randomUUID } from "node:crypto";
import { prisma } from "./client";

const normalize = (email: string) => email.trim().toLowerCase();

/** Subscribe an email (idempotent). Re-subscribes a previously unsubscribed address. */
export async function subscribe(email: string): Promise<{ created: boolean }> {
  const e = normalize(email);
  const existing = await prisma.subscriber.findUnique({ where: { email: e } });
  if (existing) {
    if (existing.unsubscribedAt) {
      await prisma.subscriber.update({ where: { email: e }, data: { unsubscribedAt: null } });
    }
    return { created: false };
  }
  await prisma.subscriber.create({ data: { email: e, token: randomUUID() } });
  return { created: true };
}

/** Unsubscribe by token. Returns the email if found (idempotent), else null. */
export async function unsubscribe(token: string): Promise<string | null> {
  const s = await prisma.subscriber.findUnique({ where: { token } });
  if (!s) return null;
  if (!s.unsubscribedAt) {
    await prisma.subscriber.update({ where: { token }, data: { unsubscribedAt: new Date() } });
  }
  return s.email;
}

/** Active (still-subscribed) recipients — email + token for the unsubscribe link. */
export function listActiveSubscribers(): Promise<{ email: string; token: string }[]> {
  return prisma.subscriber.findMany({
    where: { unsubscribedAt: null },
    select: { email: true, token: true },
  });
}

export function countSubscribers(): Promise<number> {
  return prisma.subscriber.count({ where: { unsubscribedAt: null } });
}
