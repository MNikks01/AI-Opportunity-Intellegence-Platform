import { describe, expect, it } from "vitest";
import { defaultChatModel, getProvider } from "./index";

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
