import { describe, expect, it, vi } from "vitest";
import { CATEGORY_KEYS, REGIONS } from "@aioi/intel-core";
import {
  parseFeed,
  normalize,
  looksAiRelevant,
  fetchFeed,
  rssSourceKey,
  RSS_FEEDS,
  type RssFeed,
} from "./rss";

const RSS_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Example Tech News</title>
  <item>
    <title>OpenAI ships a new agent framework</title>
    <link>https://example.com/openai-agents</link>
    <guid>https://example.com/openai-agents</guid>
    <description><![CDATA[<p>A new <b>LLM agent</b> toolkit for developers.</p>]]></description>
    <pubDate>Wed, 09 Jul 2026 12:00:00 GMT</pubDate>
  </item>
  <item>
    <title>City council approves new bike lanes</title>
    <link>https://example.com/bike-lanes</link>
    <guid>https://example.com/bike-lanes</guid>
    <description>Local transit news, nothing technical here.</description>
    <pubDate>Wed, 09 Jul 2026 11:00:00 GMT</pubDate>
  </item>
</channel></rss>`;

const ATOM_SAMPLE = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Builder Blog</title>
  <entry>
    <title>Notes on building with RAG</title>
    <link href="https://example.com/rag-notes" rel="alternate"/>
    <id>tag:example.com,2026:/rag-notes</id>
    <summary>How I wired retrieval into my app.</summary>
    <published>2026-07-10T09:00:00Z</published>
  </entry>
</feed>`;

const filteredFeed: RssFeed = {
  id: "example-news",
  name: "Example News",
  category: "news",
  url: "https://example.com/feed",
  aiFilter: true,
};
const openFeed: RssFeed = {
  id: "builder",
  name: "Builder Blog",
  category: "newsletter",
  url: "https://example.com/atom",
  aiFilter: false,
};

function textResponse(body: string): Response {
  return { ok: true, status: 200, text: () => Promise.resolve(body) } as unknown as Response;
}
function statusResponse(status: number): Response {
  return {
    ok: false,
    status,
    headers: { get: () => null },
    text: () => Promise.resolve(""),
  } as unknown as Response;
}

describe("rss connector", () => {
  it("registry keys are unique and every feed has a valid https url", () => {
    const ids = RSS_FEEDS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const f of RSS_FEEDS) expect(f.url).toMatch(/^https:\/\//);
  });

  it("every feed's region and defaultCategoryKey are valid (or undefined)", () => {
    const regions = new Set<string>(REGIONS);
    for (const f of RSS_FEEDS) {
      if (f.region !== undefined) expect(regions.has(f.region)).toBe(true);
      if (f.defaultCategoryKey !== undefined)
        expect(CATEGORY_KEYS.has(f.defaultCategoryKey)).toBe(true);
    }
  });

  it("includes the M3 big-tech AI feeds", () => {
    const ids = new Set(RSS_FEEDS.map((f) => f.id));
    expect(ids.has("nvidia")).toBe(true);
    expect(ids.has("microsoft-research")).toBe(true);
    expect(ids.has("meta-engineering")).toBe(true);
  });

  it("covers non-US regions (China, India, Europe, Japan) so the map isn't US-only", () => {
    const regions = new Set(RSS_FEEDS.map((f) => f.region).filter(Boolean));
    for (const r of ["CHINA", "INDIA", "EUROPE", "JAPAN"] as const) {
      expect(regions.has(r)).toBe(true);
    }
  });

  it("looksAiRelevant uses word boundaries (no false positives on 'email'/'maintain')", () => {
    expect(looksAiRelevant("A new LLM agent toolkit")).toBe(true);
    expect(looksAiRelevant("Thoughts on AI safety")).toBe(true);
    expect(looksAiRelevant("Please email us to maintain your domain")).toBe(false);
    expect(looksAiRelevant("City council approves bike lanes")).toBe(false);
  });

  it("parseFeed reads RSS <item> blocks and strips HTML from the summary", () => {
    const items = parseFeed(RSS_SAMPLE);
    expect(items).toHaveLength(2);
    expect(items[0]!.title).toBe("OpenAI ships a new agent framework");
    expect(items[0]!.link).toBe("https://example.com/openai-agents");
    expect(items[0]!.summary).toContain("LLM agent");
    expect(items[0]!.summary).not.toContain("<");
  });

  it("parseFeed decodes numeric and named HTML entities in titles", () => {
    const xml = `<rss><channel><item>
      <title>Uber&#8217;s AI chief on robotaxis &amp; &#x201C;agents&#x201D;</title>
      <link>https://example.com/x</link><guid>g1</guid>
      <description>agent stuff</description>
    </item></channel></rss>`;
    const [it0] = parseFeed(xml);
    expect(it0!.title).toBe("Uber’s AI chief on robotaxis & “agents”");
  });

  it("parseFeed reads Atom <entry> blocks and extracts the link href", () => {
    const items = parseFeed(ATOM_SAMPLE);
    expect(items).toHaveLength(1);
    expect(items[0]!.title).toBe("Notes on building with RAG");
    expect(items[0]!.link).toBe("https://example.com/rag-notes");
    expect(items[0]!.id).toBe("tag:example.com,2026:/rag-notes");
    expect(items[0]!.published).toBe("2026-07-10T09:00:00Z");
  });

  it("normalize keys the record to rss:<feed> and drops off-topic items on filtered feeds", () => {
    const [ai, offTopic] = parseFeed(RSS_SAMPLE);
    const rec = normalize(filteredFeed, ai!)!;
    expect(rec.source).toBe(rssSourceKey("example-news"));
    expect(rec.source).toBe("rss:example-news");
    expect(rec.externalId).toBe("https://example.com/openai-agents");
    expect(normalize(filteredFeed, offTopic!)).toBeNull(); // filtered out
  });

  it("normalize propagates the feed's source-level tags onto the record", () => {
    const taggedFeed: RssFeed = {
      ...openFeed,
      region: "US",
      defaultCategoryKey: "open-source",
    };
    const [item] = parseFeed(ATOM_SAMPLE);
    const rec = normalize(taggedFeed, item!)!;
    expect(rec.region).toBe("US");
    expect(rec.defaultCategoryKey).toBe("open-source");
  });

  it("leaves tags undefined for an untagged feed", () => {
    const [item] = parseFeed(ATOM_SAMPLE);
    const rec = normalize(openFeed, item!)!;
    expect(rec.region).toBeUndefined();
    expect(rec.defaultCategoryKey).toBeUndefined();
  });

  it("unfiltered feeds keep every valid item regardless of AI relevance", () => {
    const items = parseFeed(RSS_SAMPLE);
    // The bike-lanes item is not AI, but an unfiltered feed keeps it.
    expect(normalize(openFeed, items[1]!)).not.toBeNull();
  });

  it("fetchFeed returns normalized records and counts skips", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(textResponse(RSS_SAMPLE));
    const { records, skipped } = await fetchFeed(filteredFeed, {
      fetchImpl,
      sleep: () => Promise.resolve(),
    });
    expect(records).toHaveLength(1); // only the AI item
    expect(skipped).toBe(1);
    expect(records[0]!.source).toBe("rss:example-news");
  });

  it("fetchFeed retries on 429 then succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(statusResponse(429))
      .mockResolvedValueOnce(textResponse(ATOM_SAMPLE));
    const { records } = await fetchFeed(openFeed, { fetchImpl, sleep: () => Promise.resolve() });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(records).toHaveLength(1);
  });

  it("fetchFeed tolerates malformed XML and an empty feed", async () => {
    const empty = vi.fn().mockResolvedValue(textResponse("<rss><channel></channel></rss>"));
    expect(
      (await fetchFeed(openFeed, { fetchImpl: empty, sleep: () => Promise.resolve() })).records,
    ).toHaveLength(0);
    const garbage = vi.fn().mockResolvedValue(textResponse("not xml at all"));
    expect(
      (await fetchFeed(openFeed, { fetchImpl: garbage, sleep: () => Promise.resolve() })).records,
    ).toHaveLength(0);
  });

  it("fetchFeed throws after exhausting retries on a persistent 5xx", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(statusResponse(503));
    await expect(
      fetchFeed(openFeed, { fetchImpl, sleep: () => Promise.resolve(), maxRetries: 2 }),
    ).rejects.toThrow(/RSS fetch failed 503/);
  });
});
