import { describe, expect, it } from "vitest";
import { newsFilterSchema } from "./index";

describe("newsFilterSchema", () => {
  it("applies defaults for a bare request", () => {
    const f = newsFilterSchema.parse({});
    expect(f.sort).toBe("recent");
    expect(f.limit).toBe(25);
    expect(f.q).toBeUndefined();
  });

  it("coerces numeric query params from strings", () => {
    const f = newsFilterSchema.parse({ minOpportunity: "80", sinceDays: "7", limit: "50" });
    expect(f.minOpportunity).toBe(80);
    expect(f.sinceDays).toBe(7);
    expect(f.limit).toBe(50);
  });

  it("accepts a valid region + category + sort", () => {
    const f = newsFilterSchema.parse({
      region: "CHINA",
      category: "ai-models",
      sort: "opportunity",
    });
    expect(f.region).toBe("CHINA");
    expect(f.category).toBe("ai-models");
    expect(f.sort).toBe("opportunity");
  });

  it("rejects an unknown region, out-of-range limit, and bad sort", () => {
    expect(newsFilterSchema.safeParse({ region: "MARS" }).success).toBe(false);
    expect(newsFilterSchema.safeParse({ limit: "500" }).success).toBe(false);
    expect(newsFilterSchema.safeParse({ sort: "nonsense" }).success).toBe(false);
  });
});
