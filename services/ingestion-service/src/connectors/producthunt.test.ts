import { describe, expect, it, vi } from "vitest";
import {
  fetchTopPosts,
  normalize,
  productHuntConfigured,
  type ProductHuntPost,
} from "./producthunt";

const post: ProductHuntPost = {
  id: "42",
  name: "AgentForge",
  tagline: "build AI agents visually",
  description: "no-code agent builder",
  url: "https://www.producthunt.com/posts/agentforge",
  website: "https://agentforge.dev",
  votesCount: 320,
  commentsCount: 45,
  createdAt: "2026-07-05T00:00:00Z",
  featuredAt: "2026-07-05T08:00:00Z",
  thumbnail: { url: "https://ph.example/thumb.png" },
  topics: { edges: [{ node: { name: "Artificial Intelligence" } }, { node: { name: "No-Code" } }] },
  makers: [
    { id: "u1", name: "Ada Lovelace", username: "ada", url: "https://producthunt.com/@ada" },
  ],
};

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    headers: { get: () => null },
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe("productHuntConfigured", () => {
  it("reflects the token", () => {
    expect(productHuntConfigured({} as NodeJS.ProcessEnv)).toBe(false);
    expect(productHuntConfigured({ PRODUCTHUNT_TOKEN: "t" } as NodeJS.ProcessEnv)).toBe(true);
  });
});

describe("normalize", () => {
  it("maps a post to a SourceRecord with topics + makers in the text", () => {
    const r = normalize(post)!;
    expect(r).toMatchObject({ source: "producthunt", externalId: "42", title: "AgentForge" });
    expect(r.text).toContain("build AI agents visually");
    expect(r.text).toContain("no-code agent builder");
    expect(r.text).toContain("Artificial Intelligence"); // topic
    expect(r.text).toContain("Ada Lovelace"); // maker
  });

  it("preserves the full node in raw (website, makers, topics) for the detail view", () => {
    const raw = normalize(post)!.raw as ProductHuntPost;
    expect(raw.website).toBe("https://agentforge.dev");
    expect(raw.makers?.[0]?.username).toBe("ada");
    expect(raw.topics?.edges[0]?.node.name).toBe("Artificial Intelligence");
  });
});

describe("fetchTopPosts", () => {
  it("posts a GraphQL query with the bearer token and returns records", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ data: { posts: { edges: [{ node: post }, { node: {} }] } } }),
      );
    const { records, skipped } = await fetchTopPosts(20, {
      fetchImpl,
      env: { PRODUCTHUNT_TOKEN: "tok" } as NodeJS.ProcessEnv,
    });
    expect(records).toHaveLength(1);
    expect(records[0]!.externalId).toBe("42");
    expect(skipped).toBe(1);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toContain("api.producthunt.com");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer tok");
    expect(init.body).toContain("posts");
  });

  it("throws without a token", async () => {
    await expect(fetchTopPosts(20, { env: {} as NodeJS.ProcessEnv })).rejects.toThrow(
      /not configured/,
    );
  });
});
