/**
 * Alert email formatting (B-017 follow-up). Pure/deterministic — given a matched notification, produce
 * the subject + HTML + text for a single alert email. Sending is done by the caller via `sendEmail`
 * (see `./newsletter`). Kept dependency-free; the input is a structural subset of a Notification.
 */
export interface AlertEmailInput {
  title: string;
  body: string;
  /** Absolute link to the matched target (e.g. a trend), or the site root. */
  url: string;
  siteUrl: string;
  unsubscribeUrl: string;
}

const trimTrail = (u: string) => u.replace(/\/$/, "");
const esc = (s: string) =>
  s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c] ?? c);

export function alertEmailSubject(input: { title: string }): string {
  return `Alert: ${input.title}`;
}

export function buildAlertEmailHtml(input: AlertEmailInput): string {
  const site = trimTrail(input.siteUrl);
  return `<!doctype html><html><head><meta charset="utf-8"></head>
  <body style="margin:0;background:#f6f7f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0b0c0f">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
    <tr><td style="padding:20px 24px 8px">
      <div style="font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#5b5bd6">AI Opportunity Intelligence</div>
      <h1 style="font-size:18px;margin:10px 0 8px;line-height:1.35">${esc(input.title)}</h1>
      <p style="font-size:14px;line-height:1.6;color:#5b6472;margin:0 0 18px">${esc(input.body)}</p>
      <a href="${esc(input.url)}" style="display:inline-block;background:#5b5bd6;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:10px 18px;border-radius:8px">View the opportunity →</a>
    </td></tr>
    <tr><td style="padding:16px 24px 20px;border-top:1px solid #eef0f3">
      <p style="font-size:12px;color:#9ba3af;margin:0">
        You're receiving this because you set up an email alert.
        <a href="${esc(input.unsubscribeUrl || site)}" style="color:#5b5bd6">Manage alerts</a>.
      </p>
    </td></tr>
  </table></td></tr></table></body></html>`;
}

export function buildAlertEmailText(input: AlertEmailInput): string {
  return [
    input.title,
    "",
    input.body,
    "",
    `View: ${input.url}`,
    "",
    `Manage alerts: ${input.unsubscribeUrl || trimTrail(input.siteUrl)}`,
  ].join("\n");
}
