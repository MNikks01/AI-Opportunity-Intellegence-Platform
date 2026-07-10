/**
 * Source: Hacker News "Who is hiring?"
 * Classification: ✅ OFFICIAL — public HN Search (Algolia) API, unauthenticated. ToS reviewed
 * 2026-07-10 (hn.algolia.com/api). Auth: none. PII: none stored (job posts are public; kept in `raw`).
 *
 * Each month `whoishiring` posts an "Ask HN: Who is hiring?" thread; its top-level comments are job
 * posts. We read the latest thread and keep the AI/ML roles — hiring is a leading indicator of demand
 * (companies staff a capability before the products ship). AI-relevant posts flow through the normal
 * clustering, adding demand/momentum signal to the matching trend. Malformed items are skipped.
 */
import { z } from "zod";
import type { SourceRecord } from "@aioi/shared";

export const HN_HIRING_SOURCE_KEY = "hnhiring";
const ALGOLIA = "https://hn.algolia.com/api/v1";

/** AI/ML hiring signals — matched (case-insensitive, substring) against the post text. */
export const AI_HIRING_KEYWORDS = [
  "llm",
  "genai",
  "generative ai",
  "machine learning",
  "ml engineer",
  "ml eng",
  "ai engineer",
  "deep learning",
  "nlp",
  "computer vision",
  "rag",
  "agent",
  "prompt",
  "pytorch",
  "tensorflow",
  "hugging face",
  "transformer",
  "diffusion",
  "mlops",
  "data scientist",
  "artificial intelligence",
];

export function looksAiHiring(text: string): boolean {
  const t = text.toLowerCase();
  return AI_HIRING_KEYWORDS.some((k) => t.includes(k));
}

export interface HnHiringFetchDeps {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  maxRetries?: number;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function getJson<T>(url: string, deps: Required<HnHiringFetchDeps>): Promise<T> {
  let attempt = 0;
  for (;;) {
    const res = await deps.fetchImpl(url, { headers: { accept: "application/json" } });
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= deps.maxRetries)
        throw new Error(`HN hiring fetch failed ${res.status} after ${attempt} retries`);
      const retryAfter = Number(res.headers.get("retry-after"));
      const backoff =
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 400;
      await deps.sleep(backoff + Math.floor(Math.random() * 150));
      attempt += 1;
      continue;
    }
    if (!res.ok) throw new Error(`HN hiring fetch failed ${res.status}`);
    return (await res.json()) as T;
  }
}

function decode(s: string): string {
  return s
    .replace(/<p>/gi, " \n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#x2F;/g, "/")
    .trim();
}

/** First non-empty line of a decoded post, truncated — the "Company | Role | …" header. */
function headline(decoded: string): string {
  const first =
    decoded
      .split("\n")
      .map((l) => l.trim())
      .find(Boolean) ?? decoded;
  return first.length > 120 ? `${first.slice(0, 117)}…` : first;
}

const searchSchema = z.object({ hits: z.array(z.object({ objectID: z.string() })) });
const commentSchema = z.object({
  id: z.number(),
  text: z.string().nullable().optional(),
  created_at: z.string().optional(),
});
const threadSchema = z.object({ children: z.array(z.unknown()).optional() });

export interface HnHiringComment {
  id: number;
  text?: string | null;
  created_at?: string;
}

/** Normalize one top-level "who is hiring" comment to a SourceRecord (null if not an AI role). */
export function normalize(c: HnHiringComment): SourceRecord | null {
  const parsed = commentSchema.safeParse(c);
  if (!parsed.success || !parsed.data.text) return null;
  const decoded = decode(parsed.data.text);
  if (!decoded || !looksAiHiring(decoded)) return null;
  return {
    source: HN_HIRING_SOURCE_KEY,
    externalId: String(parsed.data.id),
    url: `https://news.ycombinator.com/item?id=${parsed.data.id}`,
    title: headline(decoded),
    publishedAt: parsed.data.created_at,
    text: decoded.slice(0, 2000),
    raw: { id: parsed.data.id },
  };
}

export interface HnHiringIngestResult {
  records: SourceRecord[];
  skipped: number;
}

/** Find the latest "Who is hiring?" thread and normalize its AI/ML job posts to SourceRecords. */
export async function fetchHiring(deps: HnHiringFetchDeps = {}): Promise<HnHiringIngestResult> {
  const resolved = {
    fetchImpl: deps.fetchImpl ?? fetch,
    sleep: deps.sleep ?? defaultSleep,
    maxRetries: deps.maxRetries ?? 3,
  };

  const search = await getJson<unknown>(
    `${ALGOLIA}/search_by_date?tags=story,author_whoishiring&query=${encodeURIComponent(
      "who is hiring",
    )}&hitsPerPage=1`,
    resolved,
  );
  const parsedSearch = searchSchema.safeParse(search);
  const storyId = parsedSearch.success ? parsedSearch.data.hits[0]?.objectID : undefined;
  if (!storyId) return { records: [], skipped: 0 };

  const thread = await getJson<unknown>(`${ALGOLIA}/items/${storyId}`, resolved);
  const parsedThread = threadSchema.safeParse(thread);
  if (!parsedThread.success) throw new Error("HN hiring: unexpected thread shape");

  const records: SourceRecord[] = [];
  let skipped = 0;
  for (const child of parsedThread.data.children ?? []) {
    const record = normalize(child as HnHiringComment);
    if (record) records.push(record);
    else skipped += 1;
  }
  return { records, skipped };
}
