import { describe, expect, it, vi } from "vitest";
import { normalize, parseRss, looksAiRelevant, fetchPackages } from "./pypi";

const SAMPLE_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>PyPI newest packages</title>
  <item>
    <title>llm-router 0.1.0</title>
    <link>https://pypi.org/project/llm-router/</link>
    <description>A tiny router for LLM agents and RAG pipelines.</description>
    <pubDate>Wed, 09 Jul 2026 12:00:00 GMT</pubDate>
  </item>
  <item>
    <title>leftpad-py 2.0.0</title>
    <link>https://pypi.org/project/leftpad-py/</link>
    <description>Pad strings on the left. Not AI at all.</description>
    <pubDate>Wed, 09 Jul 2026 11:59:00 GMT</pubDate>
  </item>
</channel></rss>`;

function textResponse(body: string): Response {
  return { ok: true, status: 200, text: () => Promise.resolve(body) } as unknown as Response;
}

describe("pypi connector", () => {
  it("looksAiRelevant matches AI keywords, not arbitrary packages", () => {
    expect(looksAiRelevant("llm-router a router for LLM agents")).toBe(true);
    expect(looksAiRelevant("leftpad-py pad strings on the left")).toBe(false);
  });

  it("parseRss extracts the package name from the RSS title", () => {
    const items = parseRss(SAMPLE_RSS);
    expect(items).toHaveLength(2);
    expect(items[0]!.name).toBe("llm-router");
    expect(items[0]!.description).toContain("RAG");
  });

  it("normalize keeps AI-relevant packages and drops the rest", () => {
    const [ai, notAi] = parseRss(SAMPLE_RSS);
    const rec = normalize(ai!)!;
    expect(rec.source).toBe("pypi");
    expect(rec.externalId).toBe("llm-router");
    expect(rec.url).toContain("pypi.org/project/llm-router");
    expect(normalize(notAi!)).toBeNull();
  });

  it("fetchPackages reads the newest feed and keeps only AI packages", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(textResponse(SAMPLE_RSS));
    const { records, skipped } = await fetchPackages({ fetchImpl, sleep: () => Promise.resolve() });
    expect(records).toHaveLength(1);
    expect(skipped).toBe(1); // the non-AI package
    expect(fetchImpl.mock.calls[0]![0]).toContain("pypi.org/rss/packages.xml");
  });
});
