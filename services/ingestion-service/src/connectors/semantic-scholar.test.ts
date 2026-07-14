import { describe, expect, it, vi } from "vitest";
import { normalize, fetchPapers, type S2Paper } from "./semantic-scholar";

const PAPER: S2Paper = {
  paperId: "abc123",
  title: "Scaling laws for agentic LLMs",
  abstract: "We study how agent performance scales with model size.",
  url: "https://www.semanticscholar.org/paper/abc123",
  year: 2026,
  publicationDate: "2026-07-01",
  citationCount: 3,
  externalIds: { DOI: "10.1/xyz" },
  authors: [{ name: "A. Researcher" }],
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status < 400,
    status,
    headers: { get: () => null },
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe("semantic-scholar connector", () => {
  it("normalize maps a paper to a SourceRecord", () => {
    const rec = normalize(PAPER)!;
    expect(rec.source).toBe("semantic-scholar");
    expect(rec.externalId).toBe("abc123");
    expect(rec.publishedAt).toBe("2026-07-01");
    expect(rec.text).toContain("Scaling laws");
    expect(rec.text).toContain("scales with model size");
  });

  it("normalize falls back to a canonical url when none is provided", () => {
    const rec = normalize({ paperId: "p9", title: "No URL paper" })!;
    expect(rec.url).toBe("https://www.semanticscholar.org/paper/p9");
  });

  it("normalize rejects an untitled / malformed paper", () => {
    expect(normalize({ paperId: "x", title: "" } as S2Paper)).toBeNull();
    expect(normalize({} as S2Paper)).toBeNull();
  });

  it("fetchPapers reads data[], caps to limit, and counts skips", async () => {
    const body = { data: [PAPER, { paperId: "bad", title: "" }, { ...PAPER, paperId: "def456" }] };
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(body));
    const { records, skipped } = await fetchPapers(10, {
      fetchImpl,
      sleep: () => Promise.resolve(),
    });
    expect(records).toHaveLength(2);
    expect(skipped).toBe(1);
    expect(fetchImpl.mock.calls[0]![0]).toContain("/paper/search/bulk");
    expect(fetchImpl.mock.calls[0]![0]).toContain("sort=publicationDate:desc");
  });

  it("fetchPapers sends the x-api-key header when a key is provided", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
    await fetchPapers(5, { fetchImpl, sleep: () => Promise.resolve(), apiKey: "secret" });
    const init = fetchImpl.mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe("secret");
  });

  it("fetchPapers retries on 429 then succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 429))
      .mockResolvedValueOnce(jsonResponse({ data: [PAPER] }));
    const { records } = await fetchPapers(10, { fetchImpl, sleep: () => Promise.resolve() });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(records).toHaveLength(1);
  });
});
