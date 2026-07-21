import { describe, expect, it } from "vitest";
import { cosineSimilarity, isNearDuplicate, jaccard, shingles } from "./dedupe";

describe("shingles", () => {
  it("builds word trigrams", () => {
    expect(shingles("a b c d", 3)).toEqual(new Set(["a b c", "b c d"]));
  });

  it("falls back to tokens for short text", () => {
    expect(shingles("a b", 3)).toEqual(new Set(["a", "b"]));
  });
});

describe("jaccard", () => {
  it("is 1 for identical sets and 0 for disjoint", () => {
    expect(jaccard(new Set([1, 2]), new Set([1, 2]))).toBe(1);
    expect(jaccard(new Set([1]), new Set([2]))).toBe(0);
  });

  it("is 0 for two empty sets", () => {
    expect(jaccard(new Set(), new Set())).toBe(0);
  });
});

describe("isNearDuplicate", () => {
  it("flags a light rewrite of the same story", () => {
    const a = "OpenAI announced GPT-5 today with major reasoning improvements for developers";
    const b =
      "OpenAI announced GPT-5 today with major reasoning improvements for developers worldwide";
    expect(isNearDuplicate(a, b)).toBe(true);
  });

  it("keeps genuinely different articles apart", () => {
    const a = "OpenAI announced GPT-5 today with reasoning improvements";
    const b = "Anthropic released a new Claude model focused on coding tasks";
    expect(isNearDuplicate(a, b)).toBe(false);
  });
});

describe("cosineSimilarity", () => {
  it("is 1 for parallel vectors and 0 for orthogonal", () => {
    expect(cosineSimilarity([1, 1], [2, 2])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("returns 0 when a vector is all-zero", () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });

  it("throws on a length mismatch", () => {
    expect(() => cosineSimilarity([1, 2], [1])).toThrow(/length mismatch/);
  });
});
