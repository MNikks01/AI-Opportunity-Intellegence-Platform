import { describe, expect, it, vi } from "vitest";
import { createClient } from "./client.js";
import { TOOL_SPECS, runTool } from "./tools.js";

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status < 400, status, json: () => Promise.resolve(body) } as unknown as Response;
}

const client = (fetchImpl: typeof fetch) =>
  createClient({ baseUrl: "https://api.test", fetchImpl });

describe("TOOL_SPECS", () => {
  it("declares the three tools with input schemas", () => {
    expect(TOOL_SPECS.map((t) => t.name)).toEqual([
      "search_trends",
      "get_trend",
      "list_build_now_opportunities",
    ]);
    expect(TOOL_SPECS.every((t) => t.inputSchema.type === "object")).toBe(true);
  });
});

describe("runTool", () => {
  it("search_trends formats title, opportunity, idea, and url", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        data: [
          {
            slug: "llm-cost",
            title: "LLM cost trackers",
            url: "https://api.test/trends/llm-cost",
            opportunity: 82,
            dimensions: { opportunity: 82, business: 75 },
            topIdea: "A spend dashboard",
          },
        ],
      }),
    );
    const out = await runTool(client(fetchImpl), "search_trends", { limit: 5, source: "github" });
    expect(out).toContain("LLM cost trackers");
    expect(out).toContain("opportunity 82");
    expect(out).toContain("business 75");
    expect(out).toContain("idea: A spend dashboard");
    // limit + source made it into the query string
    expect(fetchImpl.mock.calls[0]![0]).toContain("/api/v1/trends?");
    expect(fetchImpl.mock.calls[0]![0]).toContain("source=github");
  });

  it("get_trend returns a not-found message on 404", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, 404));
    const out = await runTool(client(fetchImpl), "get_trend", { slug: "nope" });
    expect(out).toContain('No trend found for slug "nope"');
  });

  it("get_trend requires a slug", async () => {
    const out = await runTool(client(vi.fn()), "get_trend", {});
    expect(out).toContain("'slug' is required");
  });

  it("list_build_now_opportunities formats demand/supply", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        data: [
          {
            slug: "x",
            title: "Edge inference",
            url: "https://api.test/trends/x",
            opportunity: 80,
            demand: 78,
            supply: 30,
            demandSignals: 2,
          },
        ],
      }),
    );
    const out = await runTool(client(fetchImpl), "list_build_now_opportunities", {});
    expect(out).toContain("Edge inference");
    expect(out).toContain("demand 78 · supply 30");
    expect(out).toContain("2 wanted");
  });
});
