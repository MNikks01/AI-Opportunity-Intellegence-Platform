/**
 * Source: Remote OK (jobs API)
 * Classification: ✅ OFFICIAL — public JSON API (remoteok.com/api). ToS (returned in the feed's first
 * element) asks consumers to **link back to the Remote OK job URL and credit Remote OK as the source**;
 * we satisfy this by storing each job's canonical `url` on the SourceRecord (surfaced wherever the signal
 * is shown) and crediting the source. ToS reviewed 2026-07-14. Auth: none (a descriptive User-Agent is
 * required — the API blocks the default agent). PII: none (employer/company only; no candidate data).
 *
 * Hiring is a leading DEMAND signal — a company posting a role for a capability is paying to build with
 * it. The feed is site-wide, so we keep only AI-relevant postings (the tag filter upstream is fuzzy).
 * The first array element is a legal/metadata object and is skipped. Malformed items are counted, never
 * crash the run.
 */
import { z } from "zod";
import type { SourceRecord } from "@aioi/shared";

export const REMOTEOK_SOURCE_KEY = "remoteok";
const API_URL = "https://remoteok.com/api";
const USER_AGENT = "AIOIBot/1.0 (+https://ai-opportunity-intelligence.example; ingestion)";

/** AI-relevance keywords for job postings, word-boundary matched (no false hits on "email"/"domain"). */
export const AI_KEYWORDS = [
  "ai",
  "a\\.i\\.",
  "artificial intelligence",
  "machine learning",
  "ml engineer",
  "mlops",
  "llm",
  "genai",
  "gpt",
  "openai",
  "anthropic",
  "hugging ?face",
  "pytorch",
  "tensorflow",
  "nlp",
  "computer vision",
  "deep learning",
  "data scientist",
  "ml ",
  "rag",
  "agentic",
  "prompt engineer",
  "neural",
];

const AI_REGEX = new RegExp(`\\b(?:${AI_KEYWORDS.join("|")})\\b`, "i");

export function looksAiJob(text: string): boolean {
  return AI_REGEX.test(text);
}

export interface RemoteOkFetchDeps {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  maxRetries?: number;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function getJson<T>(url: string, deps: Required<RemoteOkFetchDeps>): Promise<T> {
  let attempt = 0;
  for (;;) {
    const res = await deps.fetchImpl(url, {
      headers: { accept: "application/json", "user-agent": USER_AGENT },
    });
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= deps.maxRetries)
        throw new Error(`Remote OK fetch failed ${res.status} after ${attempt} retries`);
      const retryAfter = Number(res.headers.get("retry-after"));
      const backoff =
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 500;
      await deps.sleep(backoff + Math.floor(Math.random() * 200));
      attempt += 1;
      continue;
    }
    if (!res.ok) throw new Error(`Remote OK fetch failed ${res.status}`);
    return (await res.json()) as T;
  }
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export interface RemoteOkJob {
  id: string;
  slug?: string;
  position?: string;
  company?: string;
  tags?: string[];
  description?: string;
  url?: string;
  date?: string;
}

const remoteOkJobSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  position: z.string().min(1),
  company: z.string().optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
  url: z.string().url().optional(),
  date: z.string().optional(),
});

/** Normalize a job to a SourceRecord, or null if invalid or not AI-relevant. */
export function normalize(job: RemoteOkJob): SourceRecord | null {
  const parsed = remoteOkJobSchema.safeParse(job);
  if (!parsed.success) return null;
  const j = parsed.data;
  const haystack = [j.position, j.company, (j.tags ?? []).join(" "), stripHtml(j.description ?? "")]
    .filter(Boolean)
    .join(" ");
  if (!looksAiJob(haystack)) return null;
  const title = j.company ? `${j.position} — ${j.company}` : j.position;
  return {
    source: REMOTEOK_SOURCE_KEY,
    externalId: j.id,
    url: j.url,
    title,
    publishedAt: j.date,
    text: [j.position, j.company, (j.tags ?? []).join(", ")].filter(Boolean).join(" ").trim(),
    raw: j,
  };
}

export interface RemoteOkIngestResult {
  records: SourceRecord[];
  skipped: number;
}

/** Fetch current remote AI job postings as normalized SourceRecords. Skips the leading legal element. */
export async function fetchJobs(deps: RemoteOkFetchDeps = {}): Promise<RemoteOkIngestResult> {
  const resolved = {
    fetchImpl: deps.fetchImpl ?? fetch,
    sleep: deps.sleep ?? defaultSleep,
    maxRetries: deps.maxRetries ?? 3,
  };
  const body = await getJson<unknown[]>(API_URL, resolved);
  const rows = Array.isArray(body) ? body : [];
  const records: SourceRecord[] = [];
  let skipped = 0;
  for (const row of rows) {
    // The first element is a {legal, last_updated} metadata object with no job fields.
    if (!row || typeof row !== "object" || !("id" in row) || !("position" in row)) continue;
    const record = normalize(row as RemoteOkJob);
    if (record) records.push(record);
    else skipped += 1;
  }
  return { records, skipped };
}
