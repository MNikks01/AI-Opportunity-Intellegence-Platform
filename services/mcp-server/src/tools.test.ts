import { describe, expect, it, vi } from "vitest";
import { createClient } from "./client.js";
import { TOOL_SPECS, runTool } from "./tools.js";

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status < 400, status, json: () => Promise.resolve(body) } as unknown as Response;
}

const client = (fetchImpl: typeof fetch) =>
  createClient({ baseUrl: "https://api.test", fetchImpl });

describe("TOOL_SPECS", () => {
  it("declares all tools with input schemas", () => {
    expect(TOOL_SPECS.map((t) => t.name)).toEqual([
      "search_trends",
      "get_trend",
      "list_build_now_opportunities",
      "search_opportunities",
      "lookup_entity",
      "list_rising_entities",
      "list_recent_funding",
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

  it("search_opportunities queries /search and requires a query", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        data: [
          {
            slug: "rag",
            title: "RAG eval",
            url: "https://api.test/trends/rag",
            opportunity: 70,
            dimensions: {},
            topIdea: null,
          },
        ],
      }),
    );
    const out = await runTool(client(fetchImpl), "search_opportunities", { query: "rag eval" });
    expect(out).toContain("RAG eval");
    expect(fetchImpl.mock.calls[0]![0]).toContain("/api/v1/search?");
    expect(fetchImpl.mock.calls[0]![0]).toContain("q=rag");
    expect(await runTool(client(vi.fn()), "search_opportunities", {})).toContain("required");
  });

  it("lookup_entity formats tracked entities and handles 404", async () => {
    const found = vi.fn().mockResolvedValue(
      jsonResponse({
        data: {
          name: "openai/whisper",
          type: "REPO",
          linkedTrendCount: 3,
          momentum: { state: "accelerating", delta: 5 },
          trends: [{ slug: "asr", title: "Speech-to-text", url: "u" }],
        },
      }),
    );
    const out = await runTool(client(found), "lookup_entity", { name: "openai/whisper" });
    expect(out).toContain("openai/whisper (REPO)");
    expect(out).toContain("3 trends");
    expect(out).toContain("Speech-to-text");
    const nf = vi.fn().mockResolvedValue(jsonResponse({}, 404));
    expect(await runTool(client(nf), "lookup_entity", { name: "x/y" })).toContain("not tracked");
  });

  it("list_rising_entities prefers accelerating entities", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        data: [
          {
            name: "a/b",
            type: "MODEL",
            signalWeight: 9,
            linkedTrendCount: 2,
            momentum: { state: "accelerating", delta: 4 },
          },
          {
            name: "c/d",
            type: "REPO",
            signalWeight: 3,
            linkedTrendCount: 1,
            momentum: { state: "steady", delta: 0 },
          },
        ],
      }),
    );
    const out = await runTool(client(fetchImpl), "list_rising_entities", {});
    expect(out).toContain("a/b (MODEL)");
    expect(out).toContain("accelerating (+4)");
    expect(out).not.toContain("c/d"); // steady filtered out when some are accelerating
  });

  it("list_recent_funding formats issuer + linked trends", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        data: [
          {
            issuer: "Acme AI",
            filedAt: "2026-07-01",
            url: "u",
            trends: [{ slug: "infra", title: "AI infra", url: "u2" }],
          },
        ],
      }),
    );
    const out = await runTool(client(fetchImpl), "list_recent_funding", {});
    expect(out).toContain("Acme AI");
    expect(out).toContain("2026-07-01");
    expect(out).toContain("AI infra");
    expect(fetchImpl.mock.calls[0]![0]).toContain("/api/v1/funding");
  });
});
