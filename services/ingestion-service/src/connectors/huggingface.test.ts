import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_HF_SORT,
  fetchModels,
  fetchModelDetail,
  normalize,
  parseModelCard,
  type HfModel,
} from "./huggingface";

const model: HfModel = {
  id: "acme/tiny-llm",
  likes: 1234,
  downloads: 50000,
  pipeline_tag: "text-generation",
  tags: ["llm", "gguf"],
  createdAt: "2026-05-01T00:00:00Z",
  library_name: "transformers",
};

function jsonResponse(
  body: unknown,
  init: { ok?: boolean; status?: number; headers?: Record<string, string> } = {},
): Response {
  const headers = init.headers ?? {};
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe("normalize", () => {
  it("maps a model to a SourceRecord (id, url, tags in text)", () => {
    const r = normalize(model)!;
    expect(r).toMatchObject({
      source: "huggingface",
      externalId: "acme/tiny-llm",
      url: "https://huggingface.co/acme/tiny-llm",
      title: "acme/tiny-llm",
    });
    expect(r.text).toContain("text-generation");
    expect(r.text).toContain("llm gguf");
    expect(r.publishedAt).toBe("2026-05-01T00:00:00Z");
  });
});

describe("fetchModels", () => {
  it("requests the sorted models listing and returns records", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse([model, { junk: true }]));
    const { records, skipped } = await fetchModels(30, {
      fetchImpl,
      env: {} as NodeJS.ProcessEnv,
    });
    expect(records).toHaveLength(1);
    expect(records[0]!.externalId).toBe("acme/tiny-llm");
    expect(skipped).toBe(1);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toContain("/api/models");
    expect(url).toContain(`sort=${DEFAULT_HF_SORT}`);
    expect(url).toContain("direction=-1");
    expect((init.headers as Record<string, string>).authorization).toBeUndefined();
  });

  it("sends a bearer token when configured and honors HF_SORT", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse([]));
    await fetchModels(10, {
      fetchImpl,
      env: { HUGGINGFACE_TOKEN: "hf_x", HF_SORT: "downloads" } as NodeJS.ProcessEnv,
    });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toContain("sort=downloads");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer hf_x");
  });

  it("retries on 503 then succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 503 }))
      .mockResolvedValueOnce(jsonResponse([model]));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const { records } = await fetchModels(5, { fetchImpl, sleep, env: {} as NodeJS.ProcessEnv });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(records).toHaveLength(1);
  });
});

describe("parseModelCard (M9)", () => {
  it("derives license, params, and runtime availability from HF detail", () => {
    const card = parseModelCard({
      id: "acme/tiny-llm",
      library_name: "transformers",
      tags: ["gguf", "mlx", "text-generation"],
      cardData: { license: "apache-2.0" },
      safetensors: { total: 7_000_000_000 },
      siblings: [{ rfilename: "model.safetensors" }, { rfilename: "model.Q4_K_M.gguf" }],
    });
    expect(card.license).toBe("apache-2.0");
    expect(card.paramsB).toBe(7);
    expect(card.ggufAvailable).toBe(true);
    expect(card.mlxAvailable).toBe(true);
    expect(card.transformers).toBe(true);
    expect(card.vllmSupported).toBe(false);
    expect(card.weightsUrl).toBe("https://huggingface.co/acme/tiny-llm");
  });

  it("falls back to a license: tag and handles missing params/files", () => {
    const card = parseModelCard({ id: "x/y", tags: ["license:mit"] });
    expect(card.license).toBe("mit");
    expect(card.paramsB).toBeNull();
    expect(card.ggufAvailable).toBe(false);
  });
});

describe("fetchModelDetail (M9)", () => {
  it("returns a parsed card on 200", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ id: "acme/tiny-llm", tags: ["gguf"], cardData: {} }));
    const card = await fetchModelDetail("acme/tiny-llm", {
      fetchImpl,
      sleep: () => Promise.resolve(),
      env: {} as NodeJS.ProcessEnv,
    });
    expect(card?.ggufAvailable).toBe(true);
    expect(fetchImpl.mock.calls[0]![0]).toContain("/api/models/acme/tiny-llm");
  });

  it("returns null when the model isn't on HF (404)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, { ok: false, status: 404 }));
    const card = await fetchModelDetail("not/real", {
      fetchImpl,
      sleep: () => Promise.resolve(),
      env: {} as NodeJS.ProcessEnv,
    });
    expect(card).toBeNull();
  });
});
