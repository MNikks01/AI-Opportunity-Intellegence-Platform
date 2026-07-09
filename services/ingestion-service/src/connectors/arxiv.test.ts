import { describe, expect, it, vi } from "vitest";
import { parseAtom, normalize, fetchPapers } from "./arxiv";

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>ArXiv Query: cs.AI</title>
  <entry>
    <id>http://arxiv.org/abs/2401.12345v1</id>
    <title>A Great AI Paper</title>
    <summary>We propose a method &amp; show state-of-the-art results.</summary>
    <published>2024-01-23T12:00:00Z</published>
    <author><name>Alice Smith</name></author>
    <author><name>Bob Jones</name></author>
  </entry>
  <entry>
    <id>http://arxiv.org/abs/2401.99999v2</id>
    <title>Another Paper</title>
    <summary>Short abstract.</summary>
    <published>2024-01-22T09:00:00Z</published>
    <author><name>Carol</name></author>
  </entry>
</feed>`;

function xmlResponse(body: string): Response {
  return { ok: true, status: 200, text: () => Promise.resolve(body) } as unknown as Response;
}

describe("arxiv connector", () => {
  it("parses entries (ignoring feed-level tags) and decodes entities", () => {
    const entries = parseAtom(SAMPLE);
    expect(entries).toHaveLength(2);
    expect(entries[0]!.title).toBe("A Great AI Paper");
    expect(entries[0]!.authors).toEqual(["Alice Smith", "Bob Jones"]);
    expect(entries[0]!.summary).toContain("method & show"); // &amp; decoded
  });

  it("normalizes to a SourceRecord with the versioned arXiv id", () => {
    const rec = normalize(parseAtom(SAMPLE)[0]!);
    expect(rec).not.toBeNull();
    expect(rec!.source).toBe("arxiv");
    expect(rec!.externalId).toBe("2401.12345v1"); // abs URL prefix stripped
    expect(rec!.url).toBe("http://arxiv.org/abs/2401.12345v1");
    expect(rec!.text).toContain("A Great AI Paper");
  });

  it("fetchPapers turns the feed into records", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(xmlResponse(SAMPLE));
    const { records, skipped } = await fetchPapers(30, {
      fetchImpl,
      sleep: () => Promise.resolve(),
    });
    expect(records).toHaveLength(2);
    expect(skipped).toBe(0);
    expect(fetchImpl.mock.calls[0]![0]).toContain("export.arxiv.org/api/query");
  });
});
