/**
 * Source: GitHub
 * Classification: ✅ OFFICIAL — GitHub REST API (Search), public repos only. ToS: GitHub Terms + API
 * Terms (reviewed 2026-07-06). Sends the required User-Agent; honors rate limits (403 + reset). Works
 * unauthenticated (60 req/h); GITHUB_TOKEN raises the limit (5000 req/h) — recommended, not required.
 * PII: repo owners are public handles, kept only inside `raw`.
 *
 * Strategy: surface *emerging* AI projects — repos matching an AI query, recently created, ranked by
 * stars — so new momentum shows up (not just the same evergreen giants).
 */
import { z } from "zod";
import type { SourceRecord } from "@aioi/shared";

export const GITHUB_SOURCE_KEY = "github";
const SEARCH_URL = "https://api.github.com/search/repositories";

/** Base query (AI topic); a `created:>=<date>` freshness filter is appended at fetch time. */
export const DEFAULT_GITHUB_QUERY = "topic:llm";

function userAgent(env: NodeJS.ProcessEnv): string {
  return env.GITHUB_USER_AGENT ?? "aioi-ingestion/1.0";
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10); // YYYY-MM-DD
}

const repoSchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  html_url: z.string().url(),
  description: z.string().nullable().optional(),
  stargazers_count: z.number().optional(),
  topics: z.array(z.string()).optional(),
  created_at: z.string().optional(),
  pushed_at: z.string().optional(),
  owner: z.object({ login: z.string() }).optional(),
});
export type GitHubRepo = z.infer<typeof repoSchema>;

const searchSchema = z.object({ items: z.array(z.unknown()) });

export interface FetchDeps {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  maxRetries?: number;
  env?: NodeJS.ProcessEnv;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

type Resolved = Required<Omit<FetchDeps, "env">> & { env: NodeJS.ProcessEnv };
function resolve(deps: FetchDeps): Resolved {
  return {
    fetchImpl: deps.fetchImpl ?? fetch,
    sleep: deps.sleep ?? defaultSleep,
    maxRetries: deps.maxRetries ?? 3,
    env: deps.env ?? process.env,
  };
}

function headers(env: NodeJS.ProcessEnv): Record<string, string> {
  const h: Record<string, string> = {
    accept: "application/vnd.github+json",
    "user-agent": userAgent(env),
    "x-github-api-version": "2022-11-28",
  };
  if (env.GITHUB_TOKEN) h.authorization = `Bearer ${env.GITHUB_TOKEN}`;
  return h;
}

async function request(url: string, r: Resolved): Promise<Response> {
  let attempt = 0;
  for (;;) {
    const res = await r.fetchImpl(url, { headers: headers(r.env) });
    // GitHub signals rate limiting with 403 + X-RateLimit-Remaining: 0, or 429.
    const rateLimited =
      res.status === 429 ||
      (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0");
    if (rateLimited || res.status >= 500) {
      if (attempt >= r.maxRetries)
        throw new Error(`github fetch failed ${res.status} after ${attempt} retries`);
      const retryAfter = Number(res.headers.get("retry-after"));
      const backoff =
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 500;
      await r.sleep(backoff + Math.floor(Math.random() * 100));
      attempt += 1;
      continue;
    }
    return res;
  }
}

/** Normalize a validated repo to a SourceRecord. */
export function normalize(repo: GitHubRepo): SourceRecord | null {
  if (!repo.full_name) return null;
  const text = [repo.full_name, repo.description ?? "", (repo.topics ?? []).join(" ")]
    .filter(Boolean)
    .join(" ")
    .trim();
  return {
    source: GITHUB_SOURCE_KEY,
    externalId: String(repo.id),
    url: repo.html_url,
    title: repo.full_name,
    publishedAt: repo.created_at ?? repo.pushed_at,
    text,
    raw: repo,
  };
}

export interface IngestResult {
  records: SourceRecord[];
  skipped: number;
}

/**
 * Search recently-created repos matching the AI query, ranked by stars, as SourceRecords.
 * `query` defaults to GITHUB_QUERY / DEFAULT_GITHUB_QUERY; `sinceDays` bounds "recently created".
 */
export async function fetchRepositories(
  limit = 30,
  deps: FetchDeps = {},
  opts: { query?: string; sinceDays?: number } = {},
): Promise<IngestResult> {
  const r = resolve(deps);
  const base = opts.query ?? r.env.GITHUB_QUERY ?? DEFAULT_GITHUB_QUERY;
  const q = `${base} created:>=${isoDaysAgo(opts.sinceDays ?? 90)}`;
  const url = `${SEARCH_URL}?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=${limit}`;

  const res = await request(url, r);
  if (!res.ok) throw new Error(`github search failed ${res.status}`);
  const parsed = searchSchema.safeParse(await res.json());
  if (!parsed.success) return { records: [], skipped: 0 };

  const records: SourceRecord[] = [];
  let skipped = 0;
  for (const item of parsed.data.items) {
    const repo = repoSchema.safeParse(item);
    if (!repo.success) {
      skipped += 1;
      continue;
    }
    const record = normalize(repo.data);
    if (record) records.push(record);
    else skipped += 1;
  }
  return { records, skipped };
}
