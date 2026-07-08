import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_YOUTUBE_QUERY,
  fetchVideos,
  normalize,
  youtubeConfigured,
  youtubeQuery,
  type YouTubeItem,
} from "./youtube";

const item: YouTubeItem = {
  id: { videoId: "vid123" },
  snippet: {
    title: "Building AI agents in 2026",
    description: "a walkthrough of agent frameworks",
    publishedAt: "2026-07-01T00:00:00Z",
    channelTitle: "AI Weekly",
    channelId: "UC_ai_weekly",
  },
};

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    headers: { get: () => null },
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe("youtube config", () => {
  it("youtubeConfigured reflects the key; youtubeQuery falls back to default", () => {
    expect(youtubeConfigured({} as NodeJS.ProcessEnv)).toBe(false);
    expect(youtubeConfigured({ YOUTUBE_API_KEY: "k" } as NodeJS.ProcessEnv)).toBe(true);
    expect(youtubeQuery({} as NodeJS.ProcessEnv)).toBe(DEFAULT_YOUTUBE_QUERY);
    expect(youtubeQuery({ YOUTUBE_QUERY: "llm apps" } as NodeJS.ProcessEnv)).toBe("llm apps");
  });
});

describe("normalize", () => {
  it("maps a search item to a SourceRecord", () => {
    const r = normalize(item)!;
    expect(r).toMatchObject({
      source: "youtube",
      externalId: "vid123",
      url: "https://www.youtube.com/watch?v=vid123",
      title: "Building AI agents in 2026",
    });
    expect(r.text).toContain("agent frameworks");
    expect(r.publishedAt).toBe("2026-07-01T00:00:00Z");
  });

  it("preserves the channel id in raw (for the channel link)", () => {
    const raw = normalize(item)!.raw as YouTubeItem;
    expect(raw.snippet.channelId).toBe("UC_ai_weekly");
  });
});

describe("fetchVideos", () => {
  it("queries the Data API with the key and returns records", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ items: [item, { id: { videoId: "" } }] }));
    const { records, skipped } = await fetchVideos(25, {
      fetchImpl,
      env: { YOUTUBE_API_KEY: "yk", YOUTUBE_QUERY: "AI agents" } as NodeJS.ProcessEnv,
    });
    expect(records).toHaveLength(1);
    expect(records[0]!.externalId).toBe("vid123");
    expect(skipped).toBe(1);
    const [url] = fetchImpl.mock.calls[0]!;
    expect(url).toContain("/youtube/v3/search");
    expect(url).toContain("key=yk");
    expect(url).toContain("q=AI+agents"); // URLSearchParams encodes spaces as +
    expect(url).toContain("type=video");
  });

  it("throws without an api key", async () => {
    await expect(fetchVideos(25, { env: {} as NodeJS.ProcessEnv })).rejects.toThrow(
      /not configured/,
    );
  });
});
