import { describe, expect, it, vi } from "vitest";
import { normalize, looksAiHiring, fetchHiring } from "./hnhiring";

const SEARCH = { hits: [{ objectID: "44444444" }] };
const THREAD = {
  children: [
    {
      id: 1,
      created_at: "2026-07-01T09:00:00Z",
      text: "Acme AI | Senior ML Engineer | Remote | We build <a>LLM</a> agents with RAG &amp; PyTorch.",
    },
    {
      id: 2,
      created_at: "2026-07-01T09:01:00Z",
      text: "Bob's Bakery | Cashier | On-site | No tech.",
    },
    { id: 3, text: null }, // dropped
  ],
};

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: () => Promise.resolve(body) } as unknown as Response;
}

describe("hn hiring connector", () => {
  it("looksAiHiring matches ML/AI roles, not unrelated jobs", () => {
    expect(looksAiHiring("Senior ML Engineer building LLM agents")).toBe(true);
    expect(looksAiHiring("Cashier at a bakery, on-site")).toBe(false);
  });

  it("normalize keeps AI posts, strips HTML, and derives a headline", () => {
    const rec = normalize(THREAD.children[0] as never)!;
    expect(rec.source).toBe("hnhiring");
    expect(rec.externalId).toBe("1");
    expect(rec.url).toBe("https://news.ycombinator.com/item?id=1");
    expect(rec.title).toContain("Acme AI");
    expect(rec.text).not.toContain("<a>"); // HTML stripped
    expect(rec.text).toContain("&"); // entity decoded (&amp; → &)
    expect(normalize(THREAD.children[1] as never)).toBeNull(); // non-AI role
    expect(normalize(THREAD.children[2] as never)).toBeNull(); // no text
  });

  it("fetchHiring reads the latest thread and keeps only AI job posts", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(SEARCH)) // search_by_date
      .mockResolvedValueOnce(jsonResponse(THREAD)); // items/{id}
    const { records, skipped } = await fetchHiring({ fetchImpl, sleep: () => Promise.resolve() });
    expect(records).toHaveLength(1);
    expect(skipped).toBe(2);
    expect(fetchImpl.mock.calls[0]![0]).toContain("author_whoishiring");
    expect(fetchImpl.mock.calls[1]![0]).toContain("/items/44444444");
  });
});
