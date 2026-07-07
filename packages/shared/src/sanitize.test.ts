import { describe, expect, it } from "vitest";
import { sanitizeText } from "./index";

const hasSurrogate = (s: string) => /[\uD800-\uDFFF]/.test(s);

describe("sanitizeText", () => {
  it("strips a lone surrogate left by truncating mid-emoji (the trend.create crash)", () => {
    const truncated = "AI launch \uD83D"; // "🚀" is 🚀; keep only the high surrogate
    expect(hasSurrogate(truncated)).toBe(true);
    const clean = sanitizeText(truncated);
    expect(hasSurrogate(clean)).toBe(false);
    expect(clean).toBe("AI launch");
  });

  it("keeps a valid emoji, tabs, and newlines", () => {
    const s = "Ship 🚀 now\tfast\nline";
    expect(sanitizeText(s)).toBe(s);
  });

  it("removes NUL and C0/C1 control chars", () => {
    expect(sanitizeText("a\u0000b\u0007c\u001Fd\u009Fe")).toBe("abcde");
  });

  it("trims edges and is otherwise a no-op on clean text", () => {
    expect(sanitizeText("  hello world  ")).toBe("hello world");
  });
});
