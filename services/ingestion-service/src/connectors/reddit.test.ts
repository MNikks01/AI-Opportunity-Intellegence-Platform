import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_SUBREDDITS,
  fetchSubreddit,
  fetchSubreddits,
  getAppToken,
  normalize,
  redditConfigured,
  subredditsFromEnv,
  type RedditPost,
} from "./reddit";

const post: RedditPost = {
  id: "abc123",
  title: "Show r/LocalLLaMA: running Llama on a phone",
  selftext: "quantized 4-bit inference on-device",
  url: "https://example.com/x",
  created_utc: 1_700_000_000,
  subreddit: "LocalLLaMA",
  permalink: "/r/LocalLLaMA/comments/abc123/x",
  author: "someone",
};

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    headers: { get: () => null },
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe("reddit config", () => {
  it("redditConfigured reflects both credentials", () => {
    expect(redditConfigured({} as NodeJS.ProcessEnv)).toBe(false);
    expect(redditConfigured({ REDDIT_CLIENT_ID: "a" } as NodeJS.ProcessEnv)).toBe(false);
    expect(
      redditConfigured({ REDDIT_CLIENT_ID: "a", REDDIT_CLIENT_SECRET: "b" } as NodeJS.ProcessEnv),
    ).toBe(true);
  });

  it("subredditsFromEnv falls back to defaults, else parses the list", () => {
    expect(subredditsFromEnv({} as NodeJS.ProcessEnv)).toEqual(DEFAULT_SUBREDDITS);
    expect(subredditsFromEnv({ REDDIT_SUBREDDITS: "a, b ,c" } as NodeJS.ProcessEnv)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});

describe("normalize", () => {
  it("maps a post to a SourceRecord", () => {
    const r = normalize(post)!;
    expect(r).toMatchObject({
      source: "reddit",
      externalId: "abc123",
      url: "https://example.com/x",
    });
    expect(r.text).toContain("quantized 4-bit");
    expect(r.publishedAt).toBe(new Date(1_700_000_000 * 1000).toISOString());
  });

  it("builds a permalink URL when the post has no url", () => {
    const r = normalize({ ...post, url: undefined })!;
    expect(r.url).toBe("https://www.reddit.com/r/LocalLLaMA/comments/abc123/x");
  });
});

describe("getAppToken", () => {
  it("posts client_credentials with Basic auth and returns the token", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ access_token: "tok_123" }));
    const token = await getAppToken({
      fetchImpl,
      env: { REDDIT_CLIENT_ID: "id", REDDIT_CLIENT_SECRET: "sec" } as NodeJS.ProcessEnv,
    });
    expect(token).toBe("tok_123");
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toContain("/api/v1/access_token");
    expect((init.headers as Record<string, string>).authorization).toMatch(/^Basic /);
    expect(init.body).toContain("grant_type=client_credentials");
  });

  it("throws without credentials", async () => {
    await expect(getAppToken({ env: {} as NodeJS.ProcessEnv })).rejects.toThrow(/not configured/);
  });
});

describe("fetchSubreddit / fetchSubreddits", () => {
  const listing = {
    data: {
      children: [
        { kind: "t3", data: post },
        { kind: "t3", data: {} },
      ],
    },
  };

  it("returns normalized records and counts skips", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(listing));
    const { records, skipped } = await fetchSubreddit("LocalLLaMA", "tok", 25, { fetchImpl });
    expect(records).toHaveLength(1);
    expect(records[0]!.externalId).toBe("abc123");
    expect(skipped).toBe(1); // the malformed child
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toContain("/r/LocalLLaMA/hot");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer tok");
  });

  it("fetchSubreddits gets a token then aggregates across subs", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "tok" })) // token
      .mockResolvedValue(jsonResponse(listing)); // each listing
    const env = { REDDIT_CLIENT_ID: "id", REDDIT_CLIENT_SECRET: "sec" } as NodeJS.ProcessEnv;
    const { records } = await fetchSubreddits(["a", "b"], 25, { fetchImpl, env });
    expect(records).toHaveLength(2); // one post per sub
  });
});
