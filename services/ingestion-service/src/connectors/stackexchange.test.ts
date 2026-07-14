import { describe, expect, it, vi } from "vitest";
import { normalize, fetchQuestions, AI_TAGS, type StackQuestion } from "./stackexchange";

const Q1: StackQuestion = {
  question_id: 79980296,
  title: "How do I stream tokens from an LLM in &lt;Node.js&gt;?",
  link: "https://stackoverflow.com/questions/79980296/stream-tokens",
  tags: ["artificial-intelligence", "openai-api"],
  creation_date: 1783937509,
  score: 4,
  view_count: 151,
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status < 400,
    status,
    headers: { get: () => null },
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe("stackexchange connector", () => {
  it("normalize maps a question, decodes entities, and derives publishedAt", () => {
    const rec = normalize(Q1)!;
    expect(rec.source).toBe("stackexchange");
    expect(rec.externalId).toBe("79980296");
    expect(rec.title).toBe("How do I stream tokens from an LLM in <Node.js>?");
    expect(rec.publishedAt).toBe(new Date(1783937509 * 1000).toISOString());
    expect(rec.text).toContain("artificial-intelligence");
  });

  it("normalize rejects a malformed question", () => {
    expect(normalize({ question_id: 1, title: "" } as StackQuestion)).toBeNull();
  });

  it("fetchQuestions queries every AI tag and dedupes across tags", async () => {
    // Same question comes back under two different tags — should appear once.
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ items: [Q1] }));
    const { records } = await fetchQuestions({ fetchImpl, sleep: () => Promise.resolve() });
    expect(fetchImpl).toHaveBeenCalledTimes(AI_TAGS.length);
    expect(records).toHaveLength(1);
    expect(fetchImpl.mock.calls[0]![0]).toContain("site=stackoverflow");
    expect(fetchImpl.mock.calls[0]![0]).toContain("tagged=artificial-intelligence");
  });

  it("fetchQuestions adds the key param when provided", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ items: [] }));
    await fetchQuestions({ fetchImpl, sleep: () => Promise.resolve(), apiKey: "k123" });
    expect(fetchImpl.mock.calls[0]![0]).toContain("key=k123");
  });

  it("fetchQuestions retries on 429 then succeeds", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ items: [] }));
    fetchImpl.mockResolvedValueOnce(jsonResponse({}, 429));
    const { records } = await fetchQuestions({ fetchImpl, sleep: () => Promise.resolve() });
    // first tag: 429 then retry succeeds (empty), remaining tags succeed → no records, no throw
    expect(records).toHaveLength(0);
    expect(fetchImpl.mock.calls.length).toBeGreaterThan(AI_TAGS.length);
  });
});
