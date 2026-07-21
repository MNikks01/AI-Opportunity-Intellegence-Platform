/**
 * Digest delivery (B-033): format the daily brief as a Slack/Discord message and POST it to a webhook.
 * Kept dependency-free — the input type is structural, matching @aioi/database's BriefContent, so this
 * package doesn't take a DB dependency. Delivery is best-effort; a failing webhook is reported, not thrown.
 */

export interface DigestTrend {
  slug: string;
  title: string;
  opportunity: number;
  topIdea: string | null;
}

export interface DigestContent {
  headline: string;
  topTrends: DigestTrend[];
  watchlistCount: number;
  unreadAlerts: number;
}

const trimTrail = (u: string) => u.replace(/\/$/, "");

/** Slack Block Kit payload for the digest. `text` is the notification fallback. */
export function formatSlackDigest(content: DigestContent, siteUrl = ""): Record<string, unknown> {
  const base = trimTrail(siteUrl);
  const link = (t: DigestTrend) => (base ? `<${base}/trends/${t.slug}|${t.title}>` : t.title);
  return {
    text: `AI Opportunity Digest — ${content.headline}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "🔭 AI Opportunity Digest", emoji: true },
      },
      { type: "section", text: { type: "mrkdwn", text: content.headline } },
      { type: "divider" },
      ...content.topTrends.map((t) => ({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${link(t)}*  ·  opportunity *${t.opportunity}*${t.topIdea ? `\n💡 ${t.topIdea}` : ""}`,
        },
      })),
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `${content.watchlistCount} watchlists · ${content.unreadAlerts} unread alerts`,
          },
        ],
      },
    ],
  };
}

/** Discord webhook payload (markdown content). */
export function formatDiscordDigest(content: DigestContent, siteUrl = ""): Record<string, unknown> {
  const base = trimTrail(siteUrl);
  const lines = ["**🔭 AI Opportunity Digest**", content.headline, ""];
  for (const t of content.topTrends) {
    lines.push(`**${t.title}** · opportunity **${t.opportunity}**`);
    if (t.topIdea) lines.push(`> 💡 ${t.topIdea}`);
    if (base) lines.push(`${base}/trends/${t.slug}`);
    lines.push("");
  }
  lines.push(`_${content.watchlistCount} watchlists · ${content.unreadAlerts} unread alerts_`);
  // Discord hard-caps message content at 2000 chars.
  return { content: lines.join("\n").slice(0, 1990) };
}

/**
 * Telegram message text for the digest (HTML parse mode). Telegram caps messages at 4096 chars; we stay
 * well under. Links use `<a href>` since Telegram HTML supports anchors.
 */
export function formatTelegramDigest(content: DigestContent, siteUrl = ""): string {
  const base = trimTrail(siteUrl);
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = [`<b>🔭 AI Opportunity Digest</b>`, esc(content.headline), ""];
  for (const t of content.topTrends) {
    const title = base ? `<a href="${base}/trends/${t.slug}">${esc(t.title)}</a>` : esc(t.title);
    lines.push(`${title} · opportunity <b>${t.opportunity}</b>`);
    if (t.topIdea) lines.push(`💡 ${esc(t.topIdea)}`);
    lines.push("");
  }
  lines.push(`<i>${content.watchlistCount} watchlists · ${content.unreadAlerts} unread alerts</i>`);
  return lines.join("\n").slice(0, 4000);
}

/** POST a Telegram Bot API sendMessage. Best-effort; returns ok + status. */
export async function postTelegram(
  botToken: string,
  chatId: string,
  text: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: boolean; status: number }> {
  const res = await fetchImpl(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  return { ok: res.ok, status: res.status };
}

export async function postWebhook(
  url: string,
  payload: Record<string, unknown>,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: boolean; status: number }> {
  const res = await fetchImpl(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, status: res.status };
}

export interface DeliverDigestOptions {
  content: DigestContent;
  slackWebhookUrl?: string;
  discordWebhookUrl?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  siteUrl?: string;
  fetchImpl?: typeof fetch;
}

/** Deliver the digest to whichever channels are configured. Each is best-effort. */
export async function deliverDigest(
  opts: DeliverDigestOptions,
): Promise<{ slack?: boolean; discord?: boolean; telegram?: boolean }> {
  const out: { slack?: boolean; discord?: boolean; telegram?: boolean } = {};
  if (opts.slackWebhookUrl) {
    try {
      const r = await postWebhook(
        opts.slackWebhookUrl,
        formatSlackDigest(opts.content, opts.siteUrl),
        opts.fetchImpl,
      );
      out.slack = r.ok;
    } catch {
      out.slack = false;
    }
  }
  if (opts.discordWebhookUrl) {
    try {
      const r = await postWebhook(
        opts.discordWebhookUrl,
        formatDiscordDigest(opts.content, opts.siteUrl),
        opts.fetchImpl,
      );
      out.discord = r.ok;
    } catch {
      out.discord = false;
    }
  }
  if (opts.telegramBotToken && opts.telegramChatId) {
    try {
      const r = await postTelegram(
        opts.telegramBotToken,
        opts.telegramChatId,
        formatTelegramDigest(opts.content, opts.siteUrl),
        opts.fetchImpl,
      );
      out.telegram = r.ok;
    } catch {
      out.telegram = false;
    }
  }
  return out;
}
