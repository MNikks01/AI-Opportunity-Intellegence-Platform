/**
 * Source: Reddit
 * Classification: ✅ OFFICIAL — Reddit Data API over OAuth2, **app-only** (client_credentials grant).
 * ToS: Reddit Developer Terms + Data API Terms (reviewed 2026-07-06). Reads only PUBLIC listings; no
 * scraping of old.reddit HTML, no user-token/PII harvesting. A descriptive User-Agent is required by
 * Reddit and sent on every request. PII: authors are public handles, kept only inside `raw`.
 * Auth: REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET (create a "script" app at reddit.com/prefs/apps).
 * Unconfigured → the connector no-ops (see runRedditIngestion), so CI stays green without keys.
 */
import { z } from "zod";
import type { SourceRecord } from "@aioi/shared";

export const REDDIT_SOURCE_KEY = "reddit";
const OAUTH_BASE = "https://oauth.reddit.com";
const TOKEN_URL = "https://www.reddit.com/api/v1/access_token";

/** AI-opportunity-relevant defaults; override with REDDIT_SUBREDDITS (comma-separated). */
export const DEFAULT_SUBREDDITS = ["MachineLearning", "LocalLLaMA", "artificial", "OpenAI", "SaaS"];

function userAgent(env: NodeJS.ProcessEnv): string {
  return env.REDDIT_USER_AGENT ?? "web:aioi:v1.0 (AI Opportunity Intelligence)";
}

export function redditConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.REDDIT_CLIENT_ID && env.REDDIT_CLIENT_SECRET);
}

export function subredditsFromEnv(env: NodeJS.ProcessEnv = process.env): string[] {
  const raw = env.REDDIT_SUBREDDITS?.trim();
  if (!raw) return DEFAULT_SUBREDDITS;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const redditPostSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().optional(),
  selftext: z.string().optional(),
  created_utc: z.number().optional(),
  subreddit: z.string().optional(),
  permalink: z.string().optional(),
  score: z.number().optional(),
  num_comments: z.number().optional(),
  author: z.string().optional(),
});
export type RedditPost = z.infer<typeof redditPostSchema>;

const listingSchema = z.object({
  data: z.object({
    children: z.array(z.object({ kind: z.string().optional(), data: z.unknown() })),
  }),
});

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

async function request(url: string, init: RequestInit, r: Resolved): Promise<Response> {
  let attempt = 0;
  for (;;) {
    const res = await r.fetchImpl(url, init);
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= r.maxRetries)
        throw new Error(`reddit fetch failed ${res.status} after ${attempt} retries`);
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

/** App-only OAuth token (client_credentials). Throws if credentials are missing/rejected. */
export async function getAppToken(deps: FetchDeps = {}): Promise<string> {
  const r = resolve(deps);
  const id = r.env.REDDIT_CLIENT_ID;
  const secret = r.env.REDDIT_CLIENT_SECRET;
  if (!id || !secret) throw new Error("reddit credentials not configured");
  const basic = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await request(
    TOKEN_URL,
    {
      method: "POST",
      headers: {
        authorization: `Basic ${basic}`,
        "content-type": "application/x-www-form-urlencoded",
        "user-agent": userAgent(r.env),
      },
      body: "grant_type=client_credentials",
    },
    r,
  );
  if (!res.ok) throw new Error(`reddit token failed ${res.status}`);
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("reddit token response missing access_token");
  return json.access_token;
}

/** Normalize a validated Reddit post to a SourceRecord (null if not a title-bearing post). */
export function normalize(post: RedditPost): SourceRecord | null {
  if (!post.title) return null;
  const text = [post.title, post.selftext].filter(Boolean).join(" ").trim();
  return {
    source: REDDIT_SOURCE_KEY,
    externalId: post.id,
    url: post.url ?? `https://www.reddit.com${post.permalink ?? `/comments/${post.id}`}`,
    title: post.title,
    publishedAt: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : undefined,
    text,
    raw: post,
  };
}

export interface IngestResult {
  records: SourceRecord[];
  skipped: number;
}

/** Fetch a subreddit's hot listing as normalized SourceRecords (needs a bearer token). */
export async function fetchSubreddit(
  subreddit: string,
  token: string,
  limit: number,
  deps: FetchDeps = {},
): Promise<IngestResult> {
  const r = resolve(deps);
  const url = `${OAUTH_BASE}/r/${encodeURIComponent(subreddit)}/hot?limit=${limit}&raw_json=1`;
  const res = await request(
    url,
    { headers: { authorization: `Bearer ${token}`, "user-agent": userAgent(r.env) } },
    r,
  );
  if (!res.ok) throw new Error(`reddit listing failed ${res.status} for r/${subreddit}`);
  const parsed = listingSchema.safeParse(await res.json());
  if (!parsed.success) return { records: [], skipped: 0 };

  const records: SourceRecord[] = [];
  let skipped = 0;
  for (const child of parsed.data.data.children) {
    const post = redditPostSchema.safeParse(child.data);
    if (!post.success) {
      skipped += 1;
      continue;
    }
    const record = normalize(post.data);
    if (record) records.push(record);
    else skipped += 1;
  }
  return { records, skipped };
}

/** Fetch several subreddits' hot listings (one token, best-effort per subreddit). */
export async function fetchSubreddits(
  subreddits: string[],
  limitPerSub: number,
  deps: FetchDeps = {},
): Promise<IngestResult> {
  const token = await getAppToken(deps);
  const records: SourceRecord[] = [];
  let skipped = 0;
  for (const sub of subreddits) {
    try {
      const r = await fetchSubreddit(sub, token, limitPerSub, deps);
      records.push(...r.records);
      skipped += r.skipped;
    } catch {
      // one failing subreddit doesn't fail the pass
      skipped += 1;
    }
  }
  return { records, skipped };
}
