import { describe, expect, it, vi } from "vitest";
import { DEFAULT_GITHUB_QUERY, fetchRepositories, normalize, type GitHubRepo } from "./github";

const repo: GitHubRepo = {
  id: 987654,
  name: "agent-kit",
  full_name: "acme/agent-kit",
  html_url: "https://github.com/acme/agent-kit",
  homepage: "https://agent-kit.dev",
  description: "toolkit for building LLM agents",
  stargazers_count: 512,
  forks_count: 42,
  language: "TypeScript",
  topics: ["llm", "agents"],
  created_at: "2026-06-01T00:00:00Z",
  owner: { login: "acme", html_url: "https://github.com/acme" },
};

function jsonResponse(
  body: unknown,
  init: { ok?: boolean; status?: number; headers?: Record<string, string> } = {},
): Response {
  const headers = init.headers ?? {};
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe("normalize", () => {
  it("maps a repo to a SourceRecord (title, url, topics in text)", () => {
    const r = normalize(repo)!;
    expect(r).toMatchObject({
      source: "github",
      externalId: "987654",
      url: "https://github.com/acme/agent-kit",
      title: "acme/agent-kit",
    });
    expect(r.text).toContain("toolkit for building LLM agents");
    expect(r.text).toContain("llm agents");
    expect(r.publishedAt).toBe("2026-06-01T00:00:00Z");
  });

  it("handles a null description", () => {
    expect(normalize({ ...repo, description: null })!.text).toContain("acme/agent-kit");
  });

  it("preserves language, forks, homepage, and owner link in raw (for the detail view)", () => {
    const raw = normalize(repo)!.raw as GitHubRepo;
    expect(raw.language).toBe("TypeScript");
    expect(raw.forks_count).toBe(42);
    expect(raw.homepage).toBe("https://agent-kit.dev");
    expect(raw.owner?.html_url).toBe("https://github.com/acme");
  });
});

describe("fetchRepositories", () => {
  it("builds an AI+freshness query, sends UA + token, and returns records", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ items: [repo, { bogus: true }] }));
    const { records, skipped } = await fetchRepositories(30, {
      fetchImpl,
      env: { GITHUB_TOKEN: "ght" } as NodeJS.ProcessEnv,
    });
    expect(records).toHaveLength(1);
    expect(records[0]!.externalId).toBe("987654");
    expect(skipped).toBe(1); // the malformed item
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toContain("/search/repositories");
    expect(decodeURIComponent(url)).toContain(DEFAULT_GITHUB_QUERY);
    expect(decodeURIComponent(url)).toContain("created:>=");
    expect(url).toContain("sort=stars");
    const h = init.headers as Record<string, string>;
    expect(h.authorization).toBe("Bearer ght");
    expect(h["user-agent"]).toBeTruthy();
  });

  it("works unauthenticated (no authorization header)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ items: [] }));
    await fetchRepositories(10, { fetchImpl, env: {} as NodeJS.ProcessEnv });
    const [, init] = fetchImpl.mock.calls[0]!;
    expect((init.headers as Record<string, string>).authorization).toBeUndefined();
  });

  it("retries on a rate-limit 403 then succeeds", async () => {
    const limited = jsonResponse(
      {},
      { ok: false, status: 403, headers: { "x-ratelimit-remaining": "0" } },
    );
    const ok = jsonResponse({ items: [repo] });
    const fetchImpl = vi.fn().mockResolvedValueOnce(limited).mockResolvedValueOnce(ok);
    const sleep = vi.fn().mockResolvedValue(undefined);
    const { records } = await fetchRepositories(5, {
      fetchImpl,
      sleep,
      env: {} as NodeJS.ProcessEnv,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledOnce();
    expect(records).toHaveLength(1);
  });
});
