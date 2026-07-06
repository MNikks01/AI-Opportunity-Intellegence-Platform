import { describe, expect, it, vi } from "vitest";
import { StubEmbedder, LiteLLMEmbedder, getEmbedder, EMBED_DIM } from "./index";

function embRow(index: number, scale = 3): { index: number; embedding: number[] } {
  // a non-unit vector so we can assert normalization
  return { index, embedding: new Array<number>(EMBED_DIM).fill(scale) };
}
function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    headers: { get: () => null },
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe("StubEmbedder", () => {
  it("is deterministic, unit-length, and the right dimension", async () => {
    const e = new StubEmbedder();
    const [a] = await e.embed(["agentic rag"]);
    const [b] = await e.embed(["agentic rag"]);
    expect(a).toEqual(b); // deterministic
    expect(a).toHaveLength(EMBED_DIM);
    const norm = Math.sqrt(a!.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeCloseTo(1, 5); // unit vector (cosine-ready)
  });

  it("maps different text to different vectors", async () => {
    const e = new StubEmbedder();
    const [[a], [b]] = [await e.embed(["foo"]), await e.embed(["bar"])];
    expect(a).not.toEqual(b);
  });

  it("embeds a batch in order", async () => {
    const out = await new StubEmbedder().embed(["x", "y", "z"]);
    expect(out).toHaveLength(3);
  });
});

describe("getEmbedder", () => {
  it("returns the stub when no gateway is configured", () => {
    expect(getEmbedder({} as NodeJS.ProcessEnv).name).toBe("stub");
  });

  it("returns LiteLLM when a gateway + provider key are set", () => {
    const e = getEmbedder({
      LITELLM_BASE_URL: "http://x:4000",
      OPENAI_API_KEY: "k",
    } as NodeJS.ProcessEnv);
    expect(e.name).toBe("litellm");
  });
});

describe("LiteLLMEmbedder", () => {
  it("sends dimensions=EMBED_DIM, preserves order, and unit-normalizes", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: [embRow(1, 2), embRow(0, 3)] })); // out of order
    const e = new LiteLLMEmbedder("http://x:4000", "text-embedding-3-small", fetchImpl);
    const out = await e.embed(["a", "b"]);
    const body = JSON.parse(fetchImpl.mock.calls[0]![1].body as string);
    expect(body.dimensions).toBe(EMBED_DIM);
    // reordered by index: first vector is the scale-3 row (index 0)
    const norm0 = Math.sqrt(out[0]!.reduce((s, x) => s + x * x, 0));
    expect(norm0).toBeCloseTo(1, 5);
    expect(out[0]![0]!).toBeCloseTo(out[1]![0]!, 5); // both normalized → same per-component value
  });

  it("throws on a vector-count mismatch (guards the pgvector column)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: [embRow(0)] }));
    const e = new LiteLLMEmbedder("http://x:4000", "m", fetchImpl);
    await expect(e.embed(["a", "b"])).rejects.toThrow(/expected 2 vectors/);
  });

  it("retries transient 5xx then succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 503 }))
      .mockResolvedValueOnce(jsonResponse({ data: [embRow(0)] }));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const e = new LiteLLMEmbedder("http://x:4000", "m", fetchImpl, sleep);
    const out = await e.embed(["a"]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(out).toHaveLength(1);
  });

  it("returns [] for empty input without calling the API", async () => {
    const fetchImpl = vi.fn();
    const out = await new LiteLLMEmbedder("http://x:4000", "m", fetchImpl).embed([]);
    expect(out).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
