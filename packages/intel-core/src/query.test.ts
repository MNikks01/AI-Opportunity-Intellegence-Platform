import { describe, expect, it } from "vitest";
import { parseNlQuery } from "./query";

describe("parseNlQuery", () => {
  it("extracts region + timeframe from 'What happened in China today?'", () => {
    const p = parseNlQuery("What happened in China today?");
    expect(p.region).toBe("CHINA");
    expect(p.sinceDays).toBe(1);
    expect(p.text).toBe("What happened in China today?");
  });

  it("maps 'Latest coding models' to the coding-ai category", () => {
    const p = parseNlQuery("Latest coding models");
    expect(p.categoryKey).toBe("coding-ai");
  });

  it("flags open source + this-week from 'Open source models released this week'", () => {
    const p = parseNlQuery("Open source models released this week");
    expect(p.openSource).toBe(true);
    expect(p.sinceDays).toBe(7);
  });

  it("parses a funding threshold and infers the investments category", () => {
    const p = parseNlQuery("AI funding over $50M");
    expect(p.minFundingUsd).toBe(50_000_000);
    expect(p.categoryKey).toBe("investments");
  });

  it("parses billions and a region together", () => {
    const p = parseNlQuery("AI startups in Europe raising $1.2B");
    expect(p.region).toBe("EUROPE");
    expect(p.categoryKey).toBe("startups"); // 'startups' wins over the funding fallback
    expect(p.minFundingUsd).toBe(1_200_000_000);
  });

  it("returns just the text when nothing structured is present", () => {
    const p = parseNlQuery("something interesting");
    expect(p).toEqual({ text: "something interesting" });
  });
});
