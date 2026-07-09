/**
 * Weekly newsletter (B-035 part 2): format the top opportunities as an email and send via Resend.
 * Email-safe HTML (inline styles, table layout, light theme), a plain-text alternative, and a
 * List-Unsubscribe header for deliverability. Dependency-free; the caller supplies the data + key.
 */

export interface NewsletterTrend {
  title: string;
  url: string;
  opportunity: number | null;
  topIdea: string | null;
}

export interface NewsletterInput {
  trends: NewsletterTrend[];
  unsubscribeUrl: string;
  siteUrl: string;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function newsletterSubject(input: NewsletterInput): string {
  const top = input.trends[0];
  if (!top) return "This week in AI opportunities";
  const extra = input.trends.length > 1 ? ` + ${input.trends.length - 1} more` : "";
  return `This week in AI: ${top.title.slice(0, 60)}${extra}`;
}

export function buildNewsletterHtml(input: NewsletterInput): string {
  const base = input.siteUrl.replace(/\/$/, "");
  const rows = input.trends
    .map(
      (t) => `
      <tr><td style="padding:16px 0;border-bottom:1px solid #ececec;">
        <a href="${esc(t.url)}" style="font-size:17px;font-weight:700;color:#15171e;text-decoration:none;">${esc(t.title)}</a>
        ${t.opportunity !== null ? `<span style="margin-left:8px;font-size:13px;color:#12a594;font-weight:700;">opportunity ${t.opportunity}</span>` : ""}
        ${t.topIdea ? `<div style="margin-top:6px;font-size:14px;color:#5b6472;">&#128161; ${esc(t.topIdea)}</div>` : ""}
      </td></tr>`,
    )
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f5f5f3;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f3;padding:24px 0;"><tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;">
      <tr><td style="padding:32px;">
        <div style="font-size:15px;font-weight:700;color:#5150c8;">AI Opportunity Intelligence</div>
        <h1 style="font-size:22px;color:#15171e;margin:12px 0 4px;">This week&rsquo;s top AI opportunities</h1>
        <p style="font-size:14px;color:#5b6472;margin:0 0 4px;">The highest-opportunity trends we detected across the AI ecosystem.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
        <a href="${base}/trends" style="display:inline-block;margin-top:22px;background:#5150c8;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:8px;font-weight:700;font-size:14px;">Browse all trends &rarr;</a>
        <p style="font-size:12px;color:#9aa1b3;margin-top:28px;">You&rsquo;re receiving this because you subscribed at ${esc(base)}. <a href="${esc(input.unsubscribeUrl)}" style="color:#9aa1b3;">Unsubscribe</a>.</p>
      </td></tr>
    </table>
  </td></tr></table>
  </body></html>`;
}

export function buildNewsletterText(input: NewsletterInput): string {
  const lines = ["This week's top AI opportunities", ""];
  for (const t of input.trends) {
    lines.push(`- ${t.title}${t.opportunity !== null ? ` (opportunity ${t.opportunity})` : ""}`);
    if (t.topIdea) lines.push(`  ${t.topIdea}`);
    lines.push(`  ${t.url}`);
  }
  lines.push("", `Unsubscribe: ${input.unsubscribeUrl}`);
  return lines.join("\n");
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  from: string;
  apiKey: string;
  unsubscribeUrl: string;
  fetchImpl?: typeof fetch;
}

/** Send one email via the Resend API. Returns ok/status; the caller decides retry/skip. */
export async function sendEmail(input: SendEmailInput): Promise<{ ok: boolean; status: number }> {
  const res = await (input.fetchImpl ?? fetch)("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${input.apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: input.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      headers: { "List-Unsubscribe": `<${input.unsubscribeUrl}>` },
    }),
  });
  return { ok: res.ok, status: res.status };
}
