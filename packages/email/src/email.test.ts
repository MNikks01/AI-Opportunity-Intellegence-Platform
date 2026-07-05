import { beforeEach, describe, expect, it } from "vitest";
import {
  StubEmailProvider,
  clearOutbox,
  getEmailProvider,
  outbox,
  renderAlertEmail,
  renderBriefEmail,
} from "./index";

describe("StubEmailProvider", () => {
  beforeEach(() => clearOutbox());

  it("records sends to the outbox", async () => {
    await new StubEmailProvider().send({ to: "a@b.co", subject: "hi", text: "body" });
    expect(outbox).toHaveLength(1);
    expect(outbox[0]).toMatchObject({ to: "a@b.co", subject: "hi" });
  });

  it("getEmailProvider returns the stub without RESEND_API_KEY", () => {
    expect(getEmailProvider({} as NodeJS.ProcessEnv).name).toBe("stub");
    expect(
      getEmailProvider({ RESEND_API_KEY: "x", EMAIL_FROM: "f@x.co" } as NodeJS.ProcessEnv).name,
    ).toBe("resend");
  });
});

describe("templates", () => {
  it("renderBriefEmail lists the top trends", () => {
    const { subject, text } = renderBriefEmail({
      headline: "Top: Agentic RAG",
      topTrends: [{ title: "Agentic RAG", opportunity: 91 }],
      watchlistCount: 2,
      unreadAlerts: 1,
    });
    expect(subject).toContain("daily brief");
    expect(text).toContain("Agentic RAG (91)");
    expect(text).toContain("2 watchlists");
  });

  it("renderAlertEmail uses the alert title/body", () => {
    const { subject, text } = renderAlertEmail({ title: "opportunity ≥ 80", body: "matched" });
    expect(subject).toBe("Alert: opportunity ≥ 80");
    expect(text).toBe("matched");
  });
});
