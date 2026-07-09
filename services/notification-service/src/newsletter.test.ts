import { describe, expect, it, vi } from "vitest";
import {
  buildNewsletterHtml,
  buildNewsletterText,
  newsletterSubject,
  sendEmail,
  type NewsletterInput,
} from "./newsletter";

const input: NewsletterInput = {
  siteUrl: "https://aioi.dev/",
  unsubscribeUrl: "https://aioi.dev/unsubscribe?token=tok123",
  trends: [
    {
      title: "Local-first LLM cost trackers",
      url: "https://aioi.dev/trends/llm-cost",
      opportunity: 82,
      topIdea: "A spend dashboard",
    },
    {
      title: "Edge inference",
      url: "https://aioi.dev/trends/edge",
      opportunity: 75,
      topIdea: null,
    },
  ],
};

describe("newsletter content", () => {
  it("subject leads with the top trend + a count", () => {
    expect(newsletterSubject(input)).toBe(
      "This week in AI: Local-first LLM cost trackers + 1 more",
    );
  });

  it("html includes the linked trend, opportunity, idea, and unsubscribe link", () => {
    const html = buildNewsletterHtml(input);
    expect(html).toContain('href="https://aioi.dev/trends/llm-cost"');
    expect(html).toContain("Local-first LLM cost trackers");
    expect(html).toContain("opportunity 82");
    expect(html).toContain("A spend dashboard");
    expect(html).toContain("https://aioi.dev/unsubscribe?token=tok123");
  });

  it("text version lists trends + the unsubscribe url", () => {
    const text = buildNewsletterText(input);
    expect(text).toContain("- Local-first LLM cost trackers (opportunity 82)");
    expect(text).toContain("Unsubscribe: https://aioi.dev/unsubscribe?token=tok123");
  });
});

describe("sendEmail", () => {
  it("posts to Resend with a List-Unsubscribe header", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response);
    const r = await sendEmail({
      to: "x@y.com",
      subject: "S",
      html: "<p>h</p>",
      text: "t",
      from: "News <news@aioi.dev>",
      apiKey: "re_test",
      unsubscribeUrl: "https://aioi.dev/unsubscribe?token=tok123",
      fetchImpl,
    });
    expect(r.ok).toBe(true);
    expect(fetchImpl.mock.calls[0]![0]).toBe("https://api.resend.com/emails");
    const body = JSON.parse((fetchImpl.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.to).toBe("x@y.com");
    expect(body.headers["List-Unsubscribe"]).toBe("<https://aioi.dev/unsubscribe?token=tok123>");
  });
});
