/**
 * Source: YouTube
 * Classification: ✅ OFFICIAL — YouTube Data API v3 (Search), authenticated with an API key. ToS:
 * YouTube API Services Terms (reviewed 2026-07-06). Reads public video metadata only (no downloads,
 * no scraping). PII: channel names are public, kept only inside `raw`. Unconfigured → no-ops.
 * Auth: YOUTUBE_API_KEY (console.cloud.google.com → enable YouTube Data API v3 → API key).
 */
import { z } from "zod";
import type { SourceRecord } from "@aioi/shared";

export const YOUTUBE_SOURCE_KEY = "youtube";
const SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";

/** Search query for AI-relevant videos; override with YOUTUBE_QUERY. */
export const DEFAULT_YOUTUBE_QUERY = "AI tools";

export function youtubeConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.YOUTUBE_API_KEY);
}

export function youtubeQuery(env: NodeJS.ProcessEnv = process.env): string {
  return env.YOUTUBE_QUERY?.trim() || DEFAULT_YOUTUBE_QUERY;
}

const itemSchema = z.object({
  id: z.object({ videoId: z.string() }),
  snippet: z.object({
    title: z.string(),
    description: z.string().optional(),
    publishedAt: z.string().optional(),
    channelTitle: z.string().optional(),
    channelId: z.string().optional(),
  }),
});
export type YouTubeItem = z.infer<typeof itemSchema>;

const responseSchema = z.object({ items: z.array(z.unknown()) });

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

/** Normalize a validated search item to a SourceRecord. */
export function normalize(item: YouTubeItem): SourceRecord | null {
  if (!item.id.videoId || !item.snippet.title) return null;
  const text = [item.snippet.title, item.snippet.description ?? ""]
    .filter(Boolean)
    .join(" ")
    .trim();
  return {
    source: YOUTUBE_SOURCE_KEY,
    externalId: item.id.videoId,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    title: item.snippet.title,
    publishedAt: item.snippet.publishedAt,
    text,
    raw: item,
  };
}

export interface IngestResult {
  records: SourceRecord[];
  skipped: number;
}

/** Search recent AI videos as SourceRecords (needs YOUTUBE_API_KEY). */
export async function fetchVideos(limit = 25, deps: FetchDeps = {}): Promise<IngestResult> {
  const r = resolve(deps);
  const key = r.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("youtube api key not configured");
  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    order: "date",
    maxResults: String(limit),
    q: youtubeQuery(r.env),
    key,
  });

  let attempt = 0;
  let res: Response;
  for (;;) {
    res = await r.fetchImpl(`${SEARCH_URL}?${params.toString()}`);
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= r.maxRetries)
        throw new Error(`youtube fetch failed ${res.status} after ${attempt} retries`);
      const retryAfter = Number(res.headers.get("retry-after"));
      const backoff =
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 500;
      await r.sleep(backoff + Math.floor(Math.random() * 100));
      attempt += 1;
      continue;
    }
    break;
  }
  if (!res.ok) throw new Error(`youtube fetch failed ${res.status}`);
  const parsed = responseSchema.safeParse(await res.json());
  if (!parsed.success) return { records: [], skipped: 0 };

  const records: SourceRecord[] = [];
  let skipped = 0;
  for (const item of parsed.data.items) {
    const parsedItem = itemSchema.safeParse(item);
    if (!parsedItem.success) {
      skipped += 1;
      continue;
    }
    const record = normalize(parsedItem.data);
    if (record) records.push(record);
    else skipped += 1;
  }
  return { records, skipped };
}
