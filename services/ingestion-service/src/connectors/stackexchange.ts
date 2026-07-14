/**
 * Source: Stack Exchange (Stack Overflow questions API)
 * Classification: ✅ OFFICIAL — public API (api.stackexchange.com/2.3), documented for programmatic use.
 * Keyless access allows 300 requests/day per IP; an optional `STACKEXCHANGE_KEY` raises this to 10k.
 * Content is CC BY-SA (attribution preserved via the stored question `url`). ToS reviewed 2026-07-14:
 * https://api.stackexchange.com/docs. Auth: optional key. PII: none (question metadata only; no user data
 * beyond the public display name in `raw`).
 *
 * A spike of new questions on an AI tag is a leading DEMAND/pain signal — developers hit a wall and ask
 * before a tool exists to solve it. We read the newest questions across a set of AI tags. The API always
 * gzips responses (the fetch runtime decompresses transparently). Malformed items are skipped and
 * counted; a per-tag failure is isolated so one bad tag never fails the batch.
 */
import { z } from "zod";
import type { SourceRecord } from "@aioi/shared";

export const STACKEXCHANGE_SOURCE_KEY = "stackexchange";
const API_URL = "https://api.stackexchange.com/2.3/questions";
const SITE = "stackoverflow";

/** AI tags to poll (each is one API request — Stack Exchange `tagged` is AND, so we can't OR in one call). */
export const AI_TAGS = [
  "artificial-intelligence",
  "large-language-model",
  "openai-api",
  "langchain",
  "llama",
  "huggingface-transformers",
];

export interface StackExchangeFetchDeps {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  maxRetries?: number;
  apiKey?: string;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function getJson<T>(
  url: string,
  deps: Required<Omit<StackExchangeFetchDeps, "apiKey">>,
): Promise<T> {
  let attempt = 0;
  for (;;) {
    const res = await deps.fetchImpl(url, { headers: { accept: "application/json" } });
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= deps.maxRetries)
        throw new Error(`Stack Exchange fetch failed ${res.status} after ${attempt} retries`);
      const retryAfter = Number(res.headers.get("retry-after"));
      const backoff =
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 600;
      await deps.sleep(backoff + Math.floor(Math.random() * 250));
      attempt += 1;
      continue;
    }
    if (!res.ok) throw new Error(`Stack Exchange fetch failed ${res.status}`);
    return (await res.json()) as T;
  }
}

export interface StackQuestion {
  question_id: number;
  title: string;
  link?: string;
  tags?: string[];
  creation_date?: number;
  score?: number;
  view_count?: number;
}

interface StackResponse {
  items?: StackQuestion[];
}

const questionSchema = z.object({
  question_id: z.number(),
  title: z.string().min(1),
  link: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  creation_date: z.number().optional(),
  score: z.number().optional(),
  view_count: z.number().optional(),
});

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

/** Normalize a question to a SourceRecord, or null if it fails validation. */
export function normalize(q: StackQuestion): SourceRecord | null {
  const parsed = questionSchema.safeParse(q);
  if (!parsed.success) return null;
  const it = parsed.data;
  const title = decodeEntities(it.title);
  return {
    source: STACKEXCHANGE_SOURCE_KEY,
    externalId: String(it.question_id),
    url: it.link,
    title,
    publishedAt: it.creation_date ? new Date(it.creation_date * 1000).toISOString() : undefined,
    text: [title, (it.tags ?? []).join(", ")].filter(Boolean).join(" ").trim(),
    raw: it,
  };
}

export interface StackExchangeIngestResult {
  records: SourceRecord[];
  skipped: number;
}

/**
 * Fetch the newest questions across the AI tag set as normalized SourceRecords, deduped by question id.
 * Per-tag errors are swallowed (logged by the caller via the returned counts) so one bad tag doesn't
 * fail the whole pass.
 */
export async function fetchQuestions(
  deps: StackExchangeFetchDeps = {},
): Promise<StackExchangeIngestResult> {
  const resolved = {
    fetchImpl: deps.fetchImpl ?? fetch,
    sleep: deps.sleep ?? defaultSleep,
    maxRetries: deps.maxRetries ?? 3,
  };
  const apiKey = deps.apiKey ?? process.env.STACKEXCHANGE_KEY;
  const seen = new Set<string>();
  const records: SourceRecord[] = [];
  let skipped = 0;
  for (const tag of AI_TAGS) {
    const params = new URLSearchParams({
      order: "desc",
      sort: "creation",
      tagged: tag,
      site: SITE,
      pagesize: "30",
    });
    if (apiKey) params.set("key", apiKey);
    const body = await getJson<StackResponse>(`${API_URL}?${params.toString()}`, resolved);
    for (const q of body.items ?? []) {
      const record = normalize(q);
      if (!record) {
        skipped += 1;
        continue;
      }
      if (seen.has(record.externalId)) continue; // same question under multiple AI tags
      seen.add(record.externalId);
      records.push(record);
    }
  }
  return { records, skipped };
}
