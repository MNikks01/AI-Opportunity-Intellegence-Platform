/**
 * Source: arXiv
 * Classification: ✅ OFFICIAL — public export API (export.arxiv.org/api), unauthenticated. Metadata is
 * freely reusable; the API Terms ask only for polite rate limiting (≤ ~1 request / 3s). ToS reviewed
 * 2026-07-09: https://info.arxiv.org/help/api/tou.html. Auth: none. PII: none (author names are public).
 *
 * Fetches the latest cs.AI / cs.LG / cs.CL submissions (an Atom feed), parses entries, and normalizes
 * to SourceRecord. Papers are a leading indicator — techniques appear here months before products.
 * Malformed entries are skipped and counted, never crash the run.
 */
import { z } from "zod";
import type { SourceRecord } from "@aioi/shared";

export const ARXIV_SOURCE_KEY = "arxiv";
const ARXIV_API = "https://export.arxiv.org/api/query";
const CATEGORIES = "cat:cs.AI+OR+cat:cs.LG+OR+cat:cs.CL";

export interface ArxivFetchDeps {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  maxRetries?: number;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function getText(url: string, deps: Required<ArxivFetchDeps>): Promise<string> {
  let attempt = 0;
  for (;;) {
    const res = await deps.fetchImpl(url);
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= deps.maxRetries)
        throw new Error(`arXiv fetch failed ${res.status} after ${attempt} retries`);
      const retryAfter = Number(res.headers.get("retry-after"));
      const backoff =
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 500;
      await deps.sleep(backoff + Math.floor(Math.random() * 200));
      attempt += 1;
      continue;
    }
    if (!res.ok) throw new Error(`arXiv fetch failed ${res.status}`);
    return await res.text();
  }
}

function decode(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

const firstTag = (block: string, name: string): string | undefined => {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]!) : undefined;
};

export interface ArxivEntry {
  id: string;
  title: string;
  summary?: string;
  published?: string;
  authors: string[];
}

/** Parse the entries out of an arXiv Atom feed (feed-level tags are ignored — only <entry> blocks). */
export function parseAtom(xml: string): ArxivEntry[] {
  const entries: ArxivEntry[] = [];
  const blocks = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];
  for (const b of blocks) {
    const id = firstTag(b, "id");
    const title = firstTag(b, "title");
    if (!id || !title) continue;
    const authors = [...b.matchAll(/<name>([\s\S]*?)<\/name>/g)].map((m) => decode(m[1] ?? ""));
    entries.push({
      id,
      title,
      summary: firstTag(b, "summary"),
      published: firstTag(b, "published"),
      authors,
    });
  }
  return entries;
}

const arxivEntrySchema = z.object({
  id: z.string().url(),
  title: z.string().min(1),
  summary: z.string().optional(),
  published: z.string().optional(),
  authors: z.array(z.string()),
});

/** Normalize a parsed entry to a SourceRecord (returns null if it fails validation). */
export function normalize(entry: ArxivEntry): SourceRecord | null {
  const parsed = arxivEntrySchema.safeParse(entry);
  if (!parsed.success) return null;
  const e = parsed.data;
  const externalId = e.id.replace(/^https?:\/\/arxiv\.org\/abs\//, ""); // e.g. 2401.12345v1
  const text = [e.title, e.summary].filter(Boolean).join(" ").trim();
  return {
    source: ARXIV_SOURCE_KEY,
    externalId,
    url: e.id,
    title: e.title,
    publishedAt: e.published,
    text,
    raw: e,
  };
}

export interface ArxivIngestResult {
  records: SourceRecord[];
  skipped: number;
}

/** Fetch the latest `limit` AI papers (newest first) as normalized SourceRecords. */
export async function fetchPapers(
  limit = 30,
  deps: ArxivFetchDeps = {},
): Promise<ArxivIngestResult> {
  const resolved = {
    fetchImpl: deps.fetchImpl ?? fetch,
    sleep: deps.sleep ?? defaultSleep,
    maxRetries: deps.maxRetries ?? 3,
  };
  const url = `${ARXIV_API}?search_query=${CATEGORIES}&sortBy=submittedDate&sortOrder=descending&start=0&max_results=${limit}`;
  const xml = await getText(url, resolved);
  const records: SourceRecord[] = [];
  let skipped = 0;
  for (const entry of parseAtom(xml)) {
    const record = normalize(entry);
    if (record) records.push(record);
    else skipped += 1;
  }
  return { records, skipped };
}
