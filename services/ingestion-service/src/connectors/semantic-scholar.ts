/**
 * Source: Semantic Scholar (Academic Graph API)
 * Classification: ✅ OFFICIAL — public Graph API (api.semanticscholar.org/graph/v1), documented for
 * programmatic use. Keyless access shares a low rate pool; an optional `SEMANTIC_SCHOLAR_API_KEY` raises
 * the limit (x-api-key). Metadata is freely reusable. ToS reviewed 2026-07-14:
 * https://www.semanticscholar.org/product/api. Auth: optional key. PII: none (author names are public,
 * kept only in `raw`).
 *
 * Reads the most recently published papers matching an AI query (bulk search, sorted by publication
 * date, newest first) — a leading indicator that complements arXiv with cross-venue coverage and a
 * citation count. Malformed entries are skipped and counted, never crash the run.
 */
import { z } from "zod";
import type { SourceRecord } from "@aioi/shared";

export const SEMANTIC_SCHOLAR_SOURCE_KEY = "semantic-scholar";
const BULK_SEARCH_URL = "https://api.semanticscholar.org/graph/v1/paper/search/bulk";
const DEFAULT_QUERY = "large language model";
const FIELDS = "title,abstract,url,year,publicationDate,citationCount,externalIds,authors";

export interface SemanticScholarFetchDeps {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  maxRetries?: number;
  apiKey?: string;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function getJson<T>(
  url: string,
  deps: Required<Omit<SemanticScholarFetchDeps, "apiKey">> & { apiKey?: string },
): Promise<T> {
  let attempt = 0;
  for (;;) {
    const headers: Record<string, string> = { accept: "application/json" };
    if (deps.apiKey) headers["x-api-key"] = deps.apiKey;
    const res = await deps.fetchImpl(url, { headers });
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= deps.maxRetries)
        throw new Error(`Semantic Scholar fetch failed ${res.status} after ${attempt} retries`);
      const retryAfter = Number(res.headers.get("retry-after"));
      const backoff =
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 1000;
      await deps.sleep(backoff + Math.floor(Math.random() * 300));
      attempt += 1;
      continue;
    }
    if (!res.ok) throw new Error(`Semantic Scholar fetch failed ${res.status}`);
    return (await res.json()) as T;
  }
}

export interface S2Paper {
  paperId: string;
  title: string;
  abstract?: string | null;
  url?: string | null;
  year?: number | null;
  publicationDate?: string | null;
  citationCount?: number | null;
  externalIds?: Record<string, unknown> | null;
  authors?: { name?: string }[] | null;
}

const s2PaperSchema = z.object({
  paperId: z.string().min(1),
  title: z.string().min(1),
  abstract: z.string().nullish(),
  url: z.string().url().nullish(),
  year: z.number().nullish(),
  publicationDate: z.string().nullish(),
  citationCount: z.number().nullish(),
  externalIds: z.record(z.string(), z.unknown()).nullish(),
  authors: z.array(z.object({ name: z.string().optional() })).nullish(),
});

/** Normalize a paper to a SourceRecord, or null if it fails validation. */
export function normalize(paper: S2Paper): SourceRecord | null {
  const parsed = s2PaperSchema.safeParse(paper);
  if (!parsed.success) return null;
  const p = parsed.data;
  const text = [p.title, p.abstract].filter(Boolean).join(" ").trim();
  return {
    source: SEMANTIC_SCHOLAR_SOURCE_KEY,
    externalId: p.paperId,
    url: p.url ?? `https://www.semanticscholar.org/paper/${p.paperId}`,
    title: p.title,
    publishedAt: p.publicationDate ?? undefined,
    text,
    raw: p,
  };
}

export interface S2IngestResult {
  records: SourceRecord[];
  skipped: number;
}

/** Fetch the newest `limit` AI papers as normalized SourceRecords (bulk search, newest first). */
export async function fetchPapers(
  limit = 100,
  deps: SemanticScholarFetchDeps = {},
): Promise<S2IngestResult> {
  const resolved = {
    fetchImpl: deps.fetchImpl ?? fetch,
    sleep: deps.sleep ?? defaultSleep,
    maxRetries: deps.maxRetries ?? 4,
    apiKey: deps.apiKey ?? process.env.SEMANTIC_SCHOLAR_API_KEY,
  };
  const url = `${BULK_SEARCH_URL}?query=${encodeURIComponent(DEFAULT_QUERY)}&fields=${FIELDS}&sort=publicationDate:desc`;
  const body = await getJson<{ data?: S2Paper[] }>(url, resolved);
  const papers = (body.data ?? []).slice(0, limit);
  const records: SourceRecord[] = [];
  let skipped = 0;
  for (const paper of papers) {
    const record = normalize(paper);
    if (record) records.push(record);
    else skipped += 1;
  }
  return { records, skipped };
}
