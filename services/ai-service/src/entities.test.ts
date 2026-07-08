import { describe, expect, it } from "vitest";
import { extractEntities } from "./entities";

describe("extractEntities", () => {
  it("matches known companies/models/tools by token (case-insensitive)", () => {
    const names = extractEntities(
      "OpenAI ships GPT-4o; Meta AI releases Llama 3 with LangChain support",
    )
      .map((e) => e.name)
      .sort();
    expect(names).toContain("OpenAI");
    expect(names).toContain("GPT-4");
    expect(names).toContain("Llama");
    expect(names).toContain("LangChain");
    expect(names).toContain("Meta AI");
  });

  it("respects token boundaries (no partial matches)", () => {
    expect(extractEntities("claudette wrote about databases").map((e) => e.name)).not.toContain(
      "Claude",
    );
    // "gpt-4o" must not also register the base "gpt-4" boundary as a separate hit-through
    expect(extractEntities("using gpt-4o today").map((e) => e.name)).toEqual(["GPT-4"]);
  });

  it("dedupes repeated mentions into one entity", () => {
    const r = extractEntities("OpenAI OpenAI openai");
    expect(r.filter((e) => e.name === "OpenAI")).toHaveLength(1);
  });

  it("returns nothing for unrelated text", () => {
    expect(extractEntities("a story about gardening and cooking")).toHaveLength(0);
  });
});
