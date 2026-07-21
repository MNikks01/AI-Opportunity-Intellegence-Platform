import { describe, expect, it } from "vitest";
import { canonicalUrl, cleanText, contentHash, detectLanguage } from "./normalize";

describe("cleanText", () => {
  it("collapses whitespace and trims", () => {
    expect(cleanText("  hello   world \n\t next ")).toBe("hello world next");
  });

  it("strips zero-width chars and normalizes non-breaking spaces", () => {
    expect(cleanText("a" + "\u200B" + "b" + "\u00A0" + "c")).toBe("ab c");
  });

  it("is deterministic (same input → same output)", () => {
    const s = "Some  messy\tTitle\n";
    expect(cleanText(s)).toBe(cleanText(s));
  });
});

describe("canonicalUrl", () => {
  it("strips tracking params, fragment, and sorts the query", () => {
    const a = canonicalUrl("https://Example.com/post?utm_source=x&b=2&a=1#frag");
    expect(a).toBe("https://example.com/post?a=1&b=2");
  });

  it("dedupes the same article shared with different UTM tags", () => {
    const a = canonicalUrl("https://site.com/x?utm_campaign=twitter");
    const b = canonicalUrl("https://site.com/x?utm_campaign=newsletter");
    expect(a).toBe(b);
  });

  it("drops a trailing slash on a path but keeps the root", () => {
    expect(canonicalUrl("https://site.com/a/")).toBe("https://site.com/a");
    expect(canonicalUrl("https://site.com/")).toBe("https://site.com/");
  });

  it("returns the trimmed input when it does not parse", () => {
    expect(canonicalUrl("  not a url  ")).toBe("not a url");
  });
});

describe("contentHash", () => {
  it("is stable and case/whitespace-insensitive", () => {
    expect(contentHash("Hello  World")).toBe(contentHash("hello world"));
  });

  it("differs for different content", () => {
    expect(contentHash("OpenAI ships GPT-5")).not.toBe(contentHash("Anthropic ships Claude"));
  });

  it("incorporates the body", () => {
    expect(contentHash("t", "body a")).not.toBe(contentHash("t", "body b"));
  });
});

describe("detectLanguage", () => {
  it.each([
    ["OpenAI releases a new model", "en"],
    ["深度求索发布新模型", "zh"],
    ["新しいモデルをリリース", "ja"],
    ["새로운 모델 출시", "ko"],
    ["एआई मॉडल जारी", "hi"],
  ])("detects %s → %s", (text, expected) => {
    expect(detectLanguage(text)).toBe(expected);
  });
});
