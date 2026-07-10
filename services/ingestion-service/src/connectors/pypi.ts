/**
 * Source: PyPI
 * Classification: ✅ OFFICIAL — public PyPI RSS feeds (pypi.org/rss), unauthenticated. Package metadata
 * is public and freely reusable. ToS reviewed 2026-07-09. Auth: none. PII: none (author names public,
 * kept only in `raw`).
 *
 * PyPI has no keyless popularity-search (the XML-RPC search API was retired), so we read the official
 * "newest packages" RSS feed and keep the AI-relevant ones — a brand-new AI package on PyPI is a
 * leading indicator (a new framework/SDK ships here before most products adopt it). Non-AI and
 * malformed items are skipped and counted, never crash the run.
 */
import { z } from "zod";
import type { SourceRecord } from "@aioi/shared";

export const PYPI_SOURCE_KEY = "pypi";
const NEWEST_URL = "https://pypi.org/rss/packages.xml";

/** Keep only packages whose name/summary looks AI-relevant (the feed is site-wide). Word-boundary. */
export const AI_KEYWORDS = [
  "llm",
  "gpt",
  "agent",
  "rag",
  "embedding",
  "vector",
  "langchain",
  "llamaindex",
  "openai",
  "anthropic",
  "transformer",
  "diffusion",
  "genai",
  "chatbot",
  "prompt",
  "inference",
  "fine-tune",
  "finetune",
  "mcp",
  "artificial intelligence",
  "machine learning",
  "neural",
];

export function looksAiRelevant(text: string): boolean {
  const t = ` ${text.toLowerCase()} `;
  return AI_KEYWORDS.some((k) => t.includes(k));
}

export interface PypiFetchDeps {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  maxRetries?: number;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function getText(url: string, deps: Required<PypiFetchDeps>): Promise<string> {
  let attempt = 0;
  for (;;) {
    const res = await deps.fetchImpl(url, { headers: { accept: "application/rss+xml, text/xml" } });
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= deps.maxRetries)
        throw new Error(`PyPI fetch failed ${res.status} after ${attempt} retries`);
      const retryAfter = Number(res.headers.get("retry-after"));
      const backoff =
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 400;
      await deps.sleep(backoff + Math.floor(Math.random() * 150));
      attempt += 1;
      continue;
    }
    if (!res.ok) throw new Error(`PyPI fetch failed ${res.status}`);
    return await res.text();
  }
}

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
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

export interface PypiItem {
  name: string;
  title: string;
  link?: string;
  description?: string;
  published?: string;
}

/** Parse `<item>` blocks from the PyPI newest-packages RSS. The title is "package X.Y.Z". */
export function parseRss(xml: string): PypiItem[] {
  const items: PypiItem[] = [];
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  for (const b of blocks) {
    const title = firstTag(b, "title");
    if (!title) continue;
    const name = title.split(/\s+/)[0] ?? title; // "package 1.2.3" → "package"
    items.push({
      name,
      title,
      link: firstTag(b, "link"),
      description: firstTag(b, "description"),
      published: firstTag(b, "pubDate"),
    });
  }
  return items;
}

const pypiItemSchema = z.object({
  name: z.string().min(1),
  title: z.string().min(1),
  link: z.string().url().optional(),
  description: z.string().optional(),
  published: z.string().optional(),
});

/** Normalize a parsed item to a SourceRecord, or null if it fails validation or isn't AI-relevant. */
export function normalize(item: PypiItem): SourceRecord | null {
  const parsed = pypiItemSchema.safeParse(item);
  if (!parsed.success) return null;
  const it = parsed.data;
  if (!looksAiRelevant(`${it.name} ${it.description ?? ""}`)) return null;
  return {
    source: PYPI_SOURCE_KEY,
    externalId: it.name,
    url: it.link ?? `https://pypi.org/project/${it.name}/`,
    title: it.name,
    publishedAt: it.published,
    text: [it.name, it.description].filter(Boolean).join(" ").trim(),
    raw: it,
  };
}

export interface PypiIngestResult {
  records: SourceRecord[];
  skipped: number;
}

/** Fetch the newest AI-relevant PyPI packages as normalized SourceRecords. */
export async function fetchPackages(deps: PypiFetchDeps = {}): Promise<PypiIngestResult> {
  const resolved = {
    fetchImpl: deps.fetchImpl ?? fetch,
    sleep: deps.sleep ?? defaultSleep,
    maxRetries: deps.maxRetries ?? 3,
  };
  const xml = await getText(NEWEST_URL, resolved);
  const records: SourceRecord[] = [];
  let skipped = 0;
  for (const item of parseRss(xml)) {
    const record = normalize(item);
    if (record) records.push(record);
    else skipped += 1;
  }
  return { records, skipped };
}
