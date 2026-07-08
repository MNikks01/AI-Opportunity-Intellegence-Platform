import { describe, expect, it, vi } from "vitest";
import { defaultChatModel, getProvider, StubProvider, LiteLLMProvider } from "./index";

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: () => Promise.resolve(body) } as unknown as Response;
}

describe("extractEntities", () => {
  it("stub discovers nothing (dictionary handles the offline case)", async () => {
    expect(await new StubProvider().extractEntities("OpenAI ships GPT-4o")).toEqual([]);
  });

  it("LiteLLM parses + validates the model's JSON entities", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        choices: [
          {
            message: {
              content: JSON.stringify({
                entities: [
                  { name: "Acme AI", type: "COMPANY" },
                  { name: "not-a-type", type: "BOGUS" },
                ],
              }),
            },
          },
        ],
      }),
    );
    const p = new LiteLLMProvider("http://x:4000", "gpt-4o-mini", fetchImpl, "sk-x");
    // BOGUS type fails the enum → the whole parse rejects (strict), so the caller skips this trend
    await expect(p.extractEntities("text")).rejects.toBeTruthy();

    const ok = vi.fn().mockResolvedValue(
      jsonResponse({
        choices: [{ message: { content: '{"entities":[{"name":"Acme AI","type":"COMPANY"}]}' } }],
      }),
    );
    const p2 = new LiteLLMProvider("http://x:4000", "gpt-4o-mini", ok, "sk-x");
    expect(await p2.extractEntities("text")).toEqual([{ name: "Acme AI", type: "COMPANY" }]);
  });
});

describe("defaultChatModel", () => {
  it("matches the model to the configured provider key (AIOI_SCORING_MODEL wins)", () => {
    expect(defaultChatModel({ OPENAI_API_KEY: "k" } as NodeJS.ProcessEnv)).toBe("gpt-4o-mini");
    expect(defaultChatModel({ ANTHROPIC_API_KEY: "k" } as NodeJS.ProcessEnv)).toBe(
      "claude-opus-4-8",
    );
    // Anthropic preferred when both are present
    expect(
      defaultChatModel({ OPENAI_API_KEY: "k", ANTHROPIC_API_KEY: "k" } as NodeJS.ProcessEnv),
    ).toBe("claude-opus-4-8");
    // explicit override always wins
    expect(
      defaultChatModel({ OPENAI_API_KEY: "k", AIOI_SCORING_MODEL: "gpt-4o" } as NodeJS.ProcessEnv),
    ).toBe("gpt-4o");
    // direct-provider key (no gateway) → OpenAI-compatible default
    expect(defaultChatModel({ AIOI_LLM_API_KEY: "sk-x" } as NodeJS.ProcessEnv)).toBe("gpt-4o-mini");
  });
});

describe("getProvider", () => {
  it("returns the stub without a gateway + key, LiteLLM with them", () => {
    expect(getProvider({} as NodeJS.ProcessEnv).name).toBe("stub");
    expect(
      getProvider({ LITELLM_BASE_URL: "http://x:4000", OPENAI_API_KEY: "k" } as NodeJS.ProcessEnv)
        .name,
    ).toBe("litellm");
    // AIOI_LLM_API_KEY alone enables LiteLLM (direct provider)
    expect(
      getProvider({
        LITELLM_BASE_URL: "https://api.openai.com/v1",
        AIOI_LLM_API_KEY: "sk-x",
      } as NodeJS.ProcessEnv).name,
    ).toBe("litellm");
  });
});
