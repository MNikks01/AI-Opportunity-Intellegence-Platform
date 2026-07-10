import { describe, it, expect, vi } from "vitest";
import { getTracer, NoopTracer, usageFrom, type Tracer } from "./tracing";
import { LiteLLMProvider } from "./index";

describe("getTracer", () => {
  it("returns a NoopTracer (disabled) when Langfuse keys are absent", () => {
    const tracer = getTracer({} as NodeJS.ProcessEnv);
    expect(tracer).toBeInstanceOf(NoopTracer);
    expect(tracer.enabled).toBe(false);
  });

  it("returns an enabled tracer when both keys are present", () => {
    const tracer = getTracer({
      LANGFUSE_PUBLIC_KEY: "pk",
      LANGFUSE_SECRET_KEY: "sk",
    } as unknown as NodeJS.ProcessEnv);
    expect(tracer.enabled).toBe(true);
  });

  it("stays disabled when only one key is set", () => {
    expect(getTracer({ LANGFUSE_PUBLIC_KEY: "pk" } as unknown as NodeJS.ProcessEnv).enabled).toBe(
      false,
    );
  });
});

describe("usageFrom", () => {
  it("maps OpenAI-compatible usage fields", () => {
    expect(
      usageFrom({ usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } }),
    ).toEqual({ promptTokens: 10, completionTokens: 5, totalTokens: 15 });
  });
  it("returns undefined when no usage present", () => {
    expect(usageFrom({ choices: [] })).toBeUndefined();
    expect(usageFrom(null)).toBeUndefined();
  });
});

/** A spy tracer that records generation lifecycles for assertions. */
function spyTracer(): {
  tracer: Tracer;
  ends: { output?: unknown; error?: string }[];
  names: string[];
} {
  const ends: { output?: unknown; error?: string }[] = [];
  const names: string[] = [];
  const tracer: Tracer = {
    enabled: true,
    generation({ name }) {
      names.push(name);
      return { end: (r) => ends.push(r) };
    },
    async flush() {},
  };
  return { tracer, ends, names };
}

describe("LiteLLMProvider tracing", () => {
  const okResponse = (content: string) =>
    ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content } }],
        usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 },
      }),
    }) as unknown as Response;

  it("records a successful generation with output + usage", async () => {
    const { tracer, ends, names } = spyTracer();
    const fetchMock = vi.fn(async () =>
      okResponse(JSON.stringify({ value: 70, confidence: 0.8, rationale: "ok", evidence: ["e1"] })),
    );
    const provider = new LiteLLMProvider(
      "http://gw",
      "test-model",
      fetchMock as unknown as typeof fetch,
      undefined,
      tracer,
    );
    await provider.scoreDimension({
      dimension: "opportunity" as never,
      trendTitle: "T",
      context: "c",
      evidenceIds: ["e1"],
      rubricAnchor: "a",
    });
    expect(names).toEqual(["score-dimension"]);
    expect(ends).toHaveLength(1);
    const [end] = ends;
    expect(end?.error).toBeUndefined();
    expect(end?.output).toBeTruthy();
  });

  it("records an error generation and rethrows on a non-ok response", async () => {
    const { tracer, ends } = spyTracer();
    const fetchMock = vi.fn(async () => ({ ok: false, status: 500 }) as unknown as Response);
    const provider = new LiteLLMProvider(
      "http://gw",
      "test-model",
      fetchMock as unknown as typeof fetch,
      undefined,
      tracer,
    );
    await expect(
      provider.generateActionPlan({ trendTitle: "T", scores: {}, evidenceIds: [] }),
    ).rejects.toThrow(/LiteLLM error 500/);
    expect(ends).toHaveLength(1);
    expect(ends[0]?.error).toMatch(/500/);
  });
});
