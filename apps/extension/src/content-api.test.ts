import { describe, expect, it } from "vitest";
import { entityNameFromUrl, lookupUrl, DEFAULT_BASE } from "./content-api";

describe("entityNameFromUrl", () => {
  it("extracts owner/repo from a GitHub repo URL", () => {
    expect(entityNameFromUrl("https://github.com/modelcontextprotocol/servers")).toBe(
      "modelcontextprotocol/servers",
    );
    expect(entityNameFromUrl("https://github.com/openai/whisper/tree/main")).toBe("openai/whisper");
  });

  it("ignores non-repo GitHub pages", () => {
    expect(entityNameFromUrl("https://github.com/settings/profile")).toBeNull();
    expect(entityNameFromUrl("https://github.com/openai")).toBeNull(); // owner only
    expect(entityNameFromUrl("https://github.com/features/actions")).toBeNull();
  });

  it("extracts org/model from Hugging Face URLs (incl. /models/ prefix)", () => {
    expect(entityNameFromUrl("https://huggingface.co/meta-llama/Llama-3")).toBe(
      "meta-llama/Llama-3",
    );
    expect(entityNameFromUrl("https://huggingface.co/models/mistralai/Mistral-7B")).toBe(
      "mistralai/Mistral-7B",
    );
    expect(entityNameFromUrl("https://huggingface.co/gpt2")).toBe("gpt2"); // canonical single-segment
    expect(entityNameFromUrl("https://huggingface.co/datasets")).toBeNull();
  });

  it("returns null for unrelated hosts and bad input", () => {
    expect(entityNameFromUrl("https://example.com/a/b")).toBeNull();
    expect(entityNameFromUrl("not a url")).toBeNull();
  });

  it("builds the lookup URL against a base", () => {
    expect(lookupUrl("https://x.com", "openai/whisper")).toBe(
      "https://x.com/api/v1/entities/lookup?name=openai%2Fwhisper",
    );
    expect(lookupUrl("", "gpt2")).toBe(`${DEFAULT_BASE}/api/v1/entities/lookup?name=gpt2`);
  });
});
