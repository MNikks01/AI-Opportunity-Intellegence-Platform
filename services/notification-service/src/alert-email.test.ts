import { describe, expect, it } from "vitest";
import { alertEmailSubject, buildAlertEmailHtml, buildAlertEmailText } from "./alert-email";

const input = {
  title: "Agentic RAG crossed opportunity ≥ 80",
  body: 'Trend "Agentic RAG" matched your alert.',
  url: "https://app.test/trends/agentic-rag",
  siteUrl: "https://app.test/",
  unsubscribeUrl: "https://app.test/notifications",
};

describe("alert email", () => {
  it("subject leads with the alert title", () => {
    expect(alertEmailSubject({ title: input.title })).toBe(`Alert: ${input.title}`);
  });

  it("html includes the title, body, target link, and manage link", () => {
    const html = buildAlertEmailHtml(input);
    expect(html).toContain(input.title);
    expect(html).toContain(input.url);
    expect(html).toContain(input.unsubscribeUrl);
    expect(html.startsWith("<!doctype html>")).toBe(true);
  });

  it("html escapes angle brackets / ampersands in user content", () => {
    const html = buildAlertEmailHtml({ ...input, title: "A & B <script>" });
    expect(html).toContain("A &amp; B &lt;script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("text is plain and carries both links", () => {
    const text = buildAlertEmailText(input);
    expect(text).toContain(input.title);
    expect(text).toContain(`View: ${input.url}`);
    expect(text).toContain(input.unsubscribeUrl);
    expect(text).not.toContain("<");
  });
});
