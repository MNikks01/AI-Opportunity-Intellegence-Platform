import { describe, expect, it, vi } from "vitest";
import {
  formatSlackDigest,
  formatDiscordDigest,
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
