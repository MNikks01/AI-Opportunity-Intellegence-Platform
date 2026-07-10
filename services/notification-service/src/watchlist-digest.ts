/**
 * Personalized weekly watchlist digest (B-036). Pure/deterministic email formatting for one org's
 * watched trends — momentum + opportunity movement, and how many new alert matches landed this week.
 * Distinct from the generic newsletter (which is the same top trends for everyone). Sending is done by
 * the caller via `sendEmail` (see `./newsletter`). Dependency-free — inputs are plain shapes.
 */
export type MomentumLabel = "accelerating" | "steady" | "cooling" | "new";

const MOMENTUM_MARK: Record<MomentumLabel, string> = {
  accelerating: "↑",
  cooling: "↓",
  steady: "→",
  new: "•",
};

export interface DigestTrendItem {
  title: string;
  url: string;
  opportunity: number | null;
  momentum: MomentumLabel | null;
}

export interface WatchlistDigestInput {
  trends: DigestTrendItem[];
  /** New alert matches (unread notifications) since the last digest. */
  newMatches: number;
  siteUrl: string;
  manageUrl: string;
}

const trimTrail = (u: string) => u.replace(/\/$/, "");
const esc = (s: string) =>
  s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c] ?? c);

export function watchlistDigestSubject(input: { trends: DigestTrendItem[] }): string {
  const n = input.trends.length;
  return `Your watchlist this week — ${n} trend${n === 1 ? "" : "s"}`;
}

function line(t: DigestTrendItem): string {
  const opp = t.opportunity !== null ? ` · opportunity ${t.opportunity}` : "";
  const mark = t.momentum ? ` ${MOMENTUM_MARK[t.momentum]}` : "";
  return `${t.title}${opp}${mark}`;
}

export function buildWatchlistDigestHtml(input: WatchlistDigestInput): string {
  const rows = input.trends
    .map((t) => {
      const opp =
        t.opportunity !== null
          ? `<span style="color:#5b5bd6;font-weight:600">${t.opportunity}</span>`
          : "";
      const mark = t.momentum
        ? `<span style="color:#9ba3af"> ${MOMENTUM_MARK[t.momentum]}</span>`
        : "";
      return `<tr><td style="padding:8px 0;border-bottom:1px solid #eef0f3">
        <a href="${esc(t.url)}" style="color:#0b0c0f;text-decoration:none;font-weight:600">${esc(t.title)}</a>${mark}
      </td><td style="padding:8px 0;border-bottom:1px solid #eef0f3;text-align:right">${opp}</td></tr>`;
    })
    .join("");

  const matches =
    input.newMatches > 0
      ? `<p style="font-size:14px;color:#5b6472;margin:0 0 14px">
          <strong>${input.newMatches}</strong> new alert match${input.newMatches === 1 ? "" : "es"} this week.</p>`
      : "";

  return `<!doctype html><html><head><meta charset="utf-8"></head>
  <body style="margin:0;background:#f6f7f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0b0c0f">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
    <tr><td style="padding:20px 24px 6px">
      <div style="font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#5b5bd6">AI Opportunity Intelligence</div>
      <h1 style="font-size:18px;margin:10px 0 12px">Your watchlist this week</h1>
      ${matches}
      <table role="presentation" width="100%" style="border-collapse:collapse">${rows}</table>
      <a href="${esc(trimTrail(input.siteUrl))}/watchlists" style="display:inline-block;margin-top:18px;background:#5b5bd6;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:10px 18px;border-radius:8px">Open your watchlists →</a>
    </td></tr>
    <tr><td style="padding:14px 24px 20px;border-top:1px solid #eef0f3">
      <p style="font-size:12px;color:#9ba3af;margin:0">
        ↑ accelerating · → steady · ↓ cooling.
        <a href="${esc(input.manageUrl)}" style="color:#5b5bd6">Manage</a>.
      </p>
    </td></tr>
  </table></td></tr></table></body></html>`;
}

export function buildWatchlistDigestText(input: WatchlistDigestInput): string {
  const lines = ["Your watchlist this week", ""];
  if (input.newMatches > 0)
    lines.push(
      `${input.newMatches} new alert match${input.newMatches === 1 ? "" : "es"} this week.`,
      "",
    );
  for (const t of input.trends) {
    lines.push(`- ${line(t)}`);
    lines.push(`  ${t.url}`);
  }
  lines.push("", `Manage: ${input.manageUrl}`);
  return lines.join("\n");
}
