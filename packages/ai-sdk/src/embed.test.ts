import { describe, expect, it } from "vitest";
import { StubEmbedder, getEmbedder, EMBED_DIM } from "./index";

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
});
