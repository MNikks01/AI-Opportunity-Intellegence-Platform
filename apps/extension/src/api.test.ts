import { describe, expect, it } from "vitest";
import {
  DEFAULT_BASE,
  normalizeBase,
  opportunitiesUrl,
  searchUrl,
  appUrl,
  authHeaders,
  toOpportunities,
} from "./api";

describe("extension api helpers", () => {
  it("normalizeBase trims trailing slashes and falls back to the default", () => {
    expect(normalizeBase("https://x.com/")).toBe("https://x.com");
    expect(normalizeBase("https://x.com///")).toBe("https://x.com");
    expect(normalizeBase("  ")).toBe(DEFAULT_BASE);
    expect(normalizeBase(null)).toBe(DEFAULT_BASE);
  });

  it("builds opportunities / search / app URLs against the base", () => {
    expect(opportunitiesUrl("https://x.com", 10)).toBe(
      "https://x.com/api/v1/opportunities?limit=10",
    );
    expect(searchUrl("https://x.com/", "  rag agents ")).toBe(
      "https://x.com/api/v1/search?q=rag%20agents&limit=15",
    );
    expect(appUrl("https://x.com")).toBe("https://x.com/quadrant");
  });

  it("authHeaders only sets Authorization when a key is present", () => {
    expect(authHeaders("aioi_abc")).toEqual({ authorization: "Bearer aioi_abc" });
    expect(authHeaders("  ")).toEqual({});
    expect(authHeaders(null)).toEqual({});
  });

  it("toOpportunities maps the API envelope and drops malformed rows", () => {
    const json = {
      data: [
        { slug: "a", title: "Agent frameworks", url: "https://x.com/trends/a", opportunity: 82 },
        { slug: "b", title: "No url", opportunity: null },
        { title: "missing slug" },
        null,
        "garbage",
      ],
    };
    const out = toOpportunities(json);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({
      slug: "a",
      title: "Agent frameworks",
      url: "https://x.com/trends/a",
      opportunity: 82,
    });
    expect(out[1]!.url).toBe(`${DEFAULT_BASE}/trends/b`); // fallback url
    expect(toOpportunities(null)).toEqual([]);
    expect(toOpportunities({ data: "nope" })).toEqual([]);
  });
});
