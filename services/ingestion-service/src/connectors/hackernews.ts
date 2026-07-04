/**
 * Source: Hacker News
 * Classification: ✅ OFFICIAL — public Firebase API, unauthenticated, no documented hard rate limit.
 * ToS reviewed: https://github.com/HackerNews/API (2026-07-03). Be polite (throttle).
 * Auth: none. PII: none stored (authors are public handles; we keep only in `raw`).
 *
 * Fetches top stories, validates each item, and normalizes to SourceRecord. Handles 429 with
 * backoff (honors Retry-After). Malformed items are skipped and counted, never crash the run.
 */
import { z } from "zod";
import type { SourceRecord } from "@aioi/shared";

export const HN_SOURCE_KEY = "hackernews";
const HN_BASE = "https://hacker-news.firebaseio.com/v0";

const hnItemSchema = z.object({
  id: z.number(),
  type: z.string().optional(),
  by: z.string().optional(),
  time: z.number().optional(), // unix seconds
  title: z.string().optional(),
  url: z.string().url().optional(),
  text: z.string().optional(),
  score: z.number().optional(),
  descendants: z.number().optional(),
});
export type HnItem = z.infer<typeof hnItemSchema>;

export interface FetchDeps {
  fetchImpl?: typeof fetch;
  /** Injectable sleep so tests don't actually wait. */
  sleep?: (ms: number) => Promise<void>;
  /** Max retries on 429/5xx. */
  maxRetries?: number;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function getJson<T>(
  url: string,
  deps: Required<Pick<FetchDeps, "fetchImpl" | "sleep" | "maxRetries">>,
): Promise<T> {
  let attempt = 0;
  for (;;) {
    const res = await deps.fetchImpl(url);
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= deps.maxRetries)
        throw new Error(`HN fetch failed ${res.status} after ${attempt} retries`);
      const retryAfter = Number(res.headers.get("retry-after"));
      const backoff =
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 200;
      const jitter = Math.floor(Math.random() * 100);
      await deps.sleep(backoff + jitter);
      attempt += 1;
      continue;
    }
    if (!res.ok) throw new Error(`HN fetch failed ${res.status}`);
    return (await res.json()) as T;
  }
}

function stripHtml(s: string | undefined): string {
  return (s ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalize a validated HN item to a SourceRecord (returns null if not a story-like item). */
export function normalize(item: HnItem): SourceRecord | null {
  if (!item.title) return null; // skip comments/items without a title
  const text = [item.title, stripHtml(item.text)].filter(Boolean).join(" ").trim();
  return {
    source: HN_SOURCE_KEY,
    externalId: String(item.id),
    url: item.url ?? `https://news.ycombinator.com/item?id=${item.id}`,
    title: item.title,
    publishedAt: item.time ? new Date(item.time * 1000).toISOString() : undefined,
    text,
    raw: item,
  };
}

export interface IngestResult {
  records: SourceRecord[];
  skipped: number;
}

/** Fetch the top `limit` HN stories as normalized SourceRecords. */
export async function fetchTopStories(limit = 30, deps: FetchDeps = {}): Promise<IngestResult> {
  const resolved = {
    fetchImpl: deps.fetchImpl ?? fetch,
    sleep: deps.sleep ?? defaultSleep,
    maxRetries: deps.maxRetries ?? 3,
  };
  const ids = await getJson<number[]>(`${HN_BASE}/topstories.json`, resolved);
  const slice = ids.slice(0, limit);

  const records: SourceRecord[] = [];
  let skipped = 0;
  for (const id of slice) {
    try {
      const rawItem = await getJson<unknown>(`${HN_BASE}/item/${id}.json`, resolved);
      const parsed = hnItemSchema.safeParse(rawItem);
      if (!parsed.success) {
        skipped += 1;
        continue;
      }
      const record = normalize(parsed.data);
      if (record) records.push(record);
      else skipped += 1;
    } catch {
      // Quarantine a single bad item; the run continues.
      skipped += 1;
    }
  }
  return { records, skipped };
}
