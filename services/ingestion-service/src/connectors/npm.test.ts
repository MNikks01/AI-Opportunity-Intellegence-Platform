import { describe, expect, it, vi } from "vitest";
import { normalize, fetchPackages } from "./npm";

const SAMPLE = {
  objects: [
    {
      package: {
        name: "langchain",
        description: "Building applications with LLMs",
        date: "2026-06-01T00:00:00.000Z",
        keywords: ["llm", "ai"],
        links: { npm: "https://www.npmjs.com/package/langchain" },
      },
      score: { final: 0.95 },
    },
    { package: { description: "no name — invalid" } }, // dropped by schema
  ],
};

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: () => Promise.resolve(body) } as unknown as Response;
}

describe("npm connector", () => {
  it("normalizes a package to a SourceRecord", () => {
    const rec = normalize(SAMPLE.objects[0] as never)!;
    expect(rec.source).toBe("npm");
    expect(rec.externalId).toBe("langchain");
    expect(rec.url).toBe("https://www.npmjs.com/package/langchain");
    expect(rec.text).toContain("Building applications with LLMs");
  });

  it("fetchPackages parses the search response and skips invalid items", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(SAMPLE));
    const { records, skipped } = await fetchPackages(30, {
      fetchImpl,
      sleep: () => Promise.resolve(),
    });
    expect(records).toHaveLength(1);
    expect(skipped).toBe(1);
    expect(fetchImpl.mock.calls[0]![0]).toContain("registry.npmjs.org/-/v1/search");
    expect(fetchImpl.mock.calls[0]![0]).toContain("popularity=1.0");
  });
});
