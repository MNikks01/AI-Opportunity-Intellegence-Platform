/**
 * @aioi/email
 * Transactional email behind a provider seam. Resend in prod (via its REST API); a Stub that records to
 * an in-memory outbox for dev/test. Templates are pure functions. Never throws to the caller — delivery
 * is best-effort at call sites.
 */
import { logger } from "@aioi/logger";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailProvider {
  readonly name: string;
  send(msg: EmailMessage): Promise<void>;
}

/** In-memory outbox for dev/test — inspect `outbox` in tests; `clearOutbox()` between them. */
export const outbox: EmailMessage[] = [];
export function clearOutbox(): void {
  outbox.length = 0;
}

export class StubEmailProvider implements EmailProvider {
  readonly name = "stub";
  send(msg: EmailMessage): Promise<void> {
    outbox.push(msg);
    return Promise.resolve();
  }
}

/** Resend (https://resend.com) via its REST API. */
export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async send(msg: EmailMessage): Promise<void> {
    const res = await this.fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: this.from,
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
      }),
    });
    if (!res.ok) logger.warn({ status: res.status, to: msg.to }, "email send failed");
  }
}

/** Resend when configured (RESEND_API_KEY + EMAIL_FROM), else the Stub. */
export function getEmailProvider(env: NodeJS.ProcessEnv = process.env): EmailProvider {
  if (env.RESEND_API_KEY && env.EMAIL_FROM) {
    return new ResendEmailProvider(env.RESEND_API_KEY, env.EMAIL_FROM);
  }
  return new StubEmailProvider();
}

// ── Templates (pure) ─────────────────────────────────────────────────────────
export interface BriefLike {
  headline: string;
  topTrends: Array<{ title: string; opportunity: number }>;
  watchlistCount: number;
  unreadAlerts: number;
}

export function renderBriefEmail(brief: BriefLike): { subject: string; text: string } {
  const lines = [
    brief.headline,
    "",
    "Top opportunities:",
    ...brief.topTrends.map((t) => `  • ${t.title} (${t.opportunity})`),
    "",
    `${brief.watchlistCount} watchlists · ${brief.unreadAlerts} unread alerts`,
  ];
  return { subject: `Your daily brief — ${brief.headline}`, text: lines.join("\n") };
}

export function renderAlertEmail(input: { title: string; body: string }): {
  subject: string;
  text: string;
} {
  return { subject: `Alert: ${input.title}`, text: input.body };
}
