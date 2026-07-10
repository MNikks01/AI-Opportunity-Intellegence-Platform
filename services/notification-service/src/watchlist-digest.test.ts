import { describe, expect, it } from "vitest";
import {
  watchlistDigestSubject,
  buildWatchlistDigestHtml,
  buildWatchlistDigestText,
  type DigestTrendItem,
} from "./watchlist-digest";

const trends: DigestTrendItem[] = [
  {
    title: "Agentic RAG",
    url: "https://app.test/trends/agentic-rag",
    opportunity: 78,
    momentum: "accelerating",
  },
  {
    title: "Vector DBs",
    url: "https://app.test/trends/vector-dbs",
    opportunity: 55,
    momentum: "cooling",
  },
];
const input = {
  trends,
  newMatches: 2,
  siteUrl: "https://app.test/",
  manageUrl: "https://app.test/notifications",
};

describe("watchlist digest", () => {
  it("subject reflects the number of trends", () => {
    expect(watchlistDigestSubject({ trends })).toBe("Your watchlist this week — 2 trends");
    expect(watchlistDigestSubject({ trends: [trends[0]!] })).toBe(
      "Your watchlist this week — 1 trend",
    );
  });

  it("html includes each trend link, opportunity, momentum mark, and the match count", () => {
    const html = buildWatchlistDigestHtml(input);
    expect(html).toContain("Agentic RAG");
    expect(html).toContain("https://app.test/trends/agentic-rag");
    expect(html).toContain("78");
    expect(html).toContain("↑"); // accelerating
    expect(html).toContain("↓"); // cooling
    expect(html).toContain(">2</strong> new alert matches this week");
    expect(html.startsWith("<!doctype html>")).toBe(true);
  });

  it("html escapes user content", () => {
    const html = buildWatchlistDigestHtml({
      ...input,
      trends: [{ ...trends[0]!, title: "A & B <x>" }],
    });
    expect(html).toContain("A &amp; B &lt;x&gt;");
    expect(html).not.toContain("<x>");
  });

  it("text is plain and lists every trend url", () => {
    const text = buildWatchlistDigestText(input);
    expect(text).toContain("Agentic RAG · opportunity 78 ↑");
    expect(text).toContain("https://app.test/trends/vector-dbs");
    expect(text).toContain("2 new alert matches this week.");
    expect(text).not.toContain("<td");
  });
});
