import { describe, expect, it, vi } from "vitest";
import {
  formatSlackDigest,
  formatDiscordDigest,
  formatTelegramDigest,
  deliverDigest,
  type DigestContent,
} from "./digest";

const content: DigestContent = {
  headline: "3 fresh opportunities today.",
  topTrends: [
    { slug: "llm-cost", title: "LLM cost trackers", opportunity: 82, topIdea: "A spend dashboard" },
    { slug: "edge-infer", title: "Edge inference", opportunity: 75, topIdea: null },
  ],
  watchlistCount: 4,
  unreadAlerts: 2,
};

describe("digest formatting", () => {
  it("builds a Slack Block Kit payload with a fallback + linked trends", () => {
    const p = formatSlackDigest(content, "https://x.dev/");
    expect(p.text).toContain("3 fresh opportunities today.");
    const json = JSON.stringify(p.blocks);
    expect(json).toContain("<https://x.dev/trends/llm-cost|LLM cost trackers>");
    expect(json).toContain("opportunity *82*");
    expect(json).toContain("4 watchlists · 2 unread alerts");
  });

  it("builds a Discord markdown payload capped at 2000 chars", () => {
    const p = formatDiscordDigest(content, "https://x.dev");
    expect(String(p.content)).toContain("LLM cost trackers");
    expect(String(p.content)).toContain("https://x.dev/trends/llm-cost");
    expect(String(p.content)).toContain("💡 A spend dashboard");
    expect(String(p.content).length).toBeLessThanOrEqual(2000);
  });

  it("builds a Telegram HTML message with anchor links, escaped + capped", () => {
    const t = formatTelegramDigest(content, "https://x.dev/");
    expect(t).toContain("<b>🔭 AI Opportunity Digest</b>");
    expect(t).toContain('<a href="https://x.dev/trends/llm-cost">LLM cost trackers</a>');
    expect(t).toContain("opportunity <b>82</b>");
    expect(t.length).toBeLessThanOrEqual(4000);
  });
});

describe("deliverDigest", () => {
  it("posts to each configured webhook and reports success", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response);
    const out = await deliverDigest({
      content,
      slackWebhookUrl: "https://hooks.slack.com/services/T/B/X",
      discordWebhookUrl: "https://discord.com/api/webhooks/1/abc",
      fetchImpl,
    });
    expect(out).toEqual({ slack: true, discord: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[0]![0]).toContain("hooks.slack.com");
  });

  it("delivers to Telegram via the Bot API when a token + chat id are set", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response);
    const out = await deliverDigest({
      content,
      telegramBotToken: "123:ABC",
      telegramChatId: "-100987",
      fetchImpl,
    });
    expect(out).toEqual({ telegram: true });
    expect(fetchImpl.mock.calls[0]![0]).toContain("api.telegram.org/bot123:ABC/sendMessage");
    const body = JSON.parse((fetchImpl.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.chat_id).toBe("-100987");
    expect(body.parse_mode).toBe("HTML");
  });

  it("reports a failed channel without throwing", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network"));
    const out = await deliverDigest({
      content,
      slackWebhookUrl: "https://hooks.slack.com/services/T/B/X",
      fetchImpl,
    });
    expect(out).toEqual({ slack: false });
  });
});
