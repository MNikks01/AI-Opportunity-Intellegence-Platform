/**
 * Source: RSS / Atom feeds (multi-publisher)
 * Classification: ✅ OFFICIAL — every feed in the registry is a publisher's own, publicly documented
 * RSS/Atom endpoint, unauthenticated, intended for syndication. We store only the public post metadata
 * (title, link, summary, publish date). ToS: syndication feeds are published for exactly this use;
 * we throttle politely and set a descriptive User-Agent. Feed URLs verified live 2026-07-13. Auth: none.
 * PII: none (author bylines, when present, are public and kept only in `raw`).
 *
 * One connector, many feeds. Each feed is registered as its own Source (`rss:<id>`) so per-publisher
 * attribution, dedupe, and health tracking all work; a single generic parser handles both RSS `<item>`
 * and Atom `<entry>`. General-interest publishers are filtered to AI-relevant items; AI-native and
 * curated feeds are kept whole. A blog post is a leading indicator — a lab/company/newsletter writes
 * about a technique or launch before it becomes a search trend.
 *
 * Malformed entries and (for filtered feeds) off-topic items are skipped and counted, never crash a run.
 */
import { z } from "zod";
import type { SourceRecord } from "@aioi/shared";
import type { Region } from "@aioi/intel-core";

export const RSS_SOURCE_PREFIX = "rss";
/** Stable per-feed source key, e.g. `rss:openai`. */
export const rssSourceKey = (feedId: string): string => `${RSS_SOURCE_PREFIX}:${feedId}`;

export type RssCategory = "research" | "news" | "vc" | "cloud" | "infra" | "newsletter" | "dev";

export interface RssFeed {
  id: string;
  name: string;
  category: RssCategory;
  url: string;
  /** General publishers: keep only AI-relevant items. AI-native / already-AI-scoped feeds: keep all. */
  aiFilter: boolean;
  /**
   * Source-level tags (M3). `region`: the company/lab's home region for company-blog feeds where the
   * story region is meaningful; left undefined for global publishers (news/newsletters/VC) so the
   * per-article classifier decides. `defaultCategoryKey`: a low-confidence fallback for strongly
   * single-topic feeds (e.g. Hugging Face → open-source); undefined for broad feeds.
   */
  region?: Region;
  defaultCategoryKey?: string;
}

/**
 * The feed registry. Original feeds verified live 2026-07-13; the big-tech AI blogs (NVIDIA, Microsoft
 * Research, Meta Engineering) added + verified live 2026-07-21 (M3). Add feeds here — no new code is
 * needed. `aiFilter: true` restricts a broad publisher to AI-relevant posts; AI-native feeds keep
 * everything. `region` / `defaultCategoryKey` tag the resulting Source (see the RssFeed doc).
 */
export const RSS_FEEDS: RssFeed[] = [
  // Research labs & AI-native companies (unfiltered). Region = the lab's home region.
  {
    id: "openai",
    name: "OpenAI",
    category: "research",
    url: "https://openai.com/news/rss.xml",
    aiFilter: false,
    region: "US",
    defaultCategoryKey: "ai-models",
  },
  {
    id: "deepmind",
    name: "Google DeepMind",
    category: "research",
    url: "https://deepmind.google/blog/rss.xml",
    aiFilter: false,
    region: "EUROPE",
    defaultCategoryKey: "ai-models",
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    category: "research",
    url: "https://huggingface.co/blog/feed.xml",
    aiFilter: false,
    region: "US",
    defaultCategoryKey: "open-source",
  },
  {
    id: "google-ai",
    name: "Google AI",
    category: "research",
    url: "https://blog.google/technology/ai/rss/",
    aiFilter: false,
    region: "US",
    defaultCategoryKey: "big-tech",
  },
  // Big-tech AI / research blogs (verified live 2026-07-21). Broad publishers → aiFilter.
  {
    id: "nvidia",
    name: "NVIDIA Blog",
    category: "infra",
    url: "https://blogs.nvidia.com/feed/",
    aiFilter: true,
    region: "US",
    defaultCategoryKey: "hardware",
  },
  {
    id: "microsoft-research",
    name: "Microsoft Research",
    category: "research",
    url: "https://www.microsoft.com/en-us/research/feed/",
    aiFilter: true,
    region: "US",
    defaultCategoryKey: "research-papers",
  },
  {
    id: "meta-engineering",
    name: "Meta Engineering",
    category: "dev",
    url: "https://engineering.fb.com/feed/",
    aiFilter: true,
    region: "US",
    defaultCategoryKey: "big-tech",
  },
  // AI newsletters & builder blogs (curated, unfiltered). Global coverage → no region.
  {
    id: "import-ai",
    name: "Import AI",
    category: "newsletter",
    url: "https://jack-clark.net/feed/",
    aiFilter: false,
  },
  {
    id: "latent-space",
    name: "Latent Space",
    category: "newsletter",
    url: "https://www.latent.space/feed",
    aiFilter: false,
  },
  {
    id: "simonwillison",
    name: "Simon Willison",
    category: "newsletter",
    url: "https://simonwillison.net/atom/everything/",
    aiFilter: false,
  },
  // AI-scoped tag feeds (already AI, unfiltered)
  {
    id: "wired-ai",
    name: "Wired · AI",
    category: "news",
    url: "https://www.wired.com/feed/tag/ai/latest/rss",
    aiFilter: false,
  },
  {
    id: "devto-ai",
    name: "DEV · AI",
    category: "dev",
    url: "https://dev.to/feed/tag/ai",
    aiFilter: false,
    defaultCategoryKey: "developer-tools",
  },
  // Startup / VC (unfiltered — startup signal is on-thesis)
  {
    id: "ycombinator",
    name: "Y Combinator",
    category: "vc",
    url: "https://www.ycombinator.com/blog/rss.xml",
    aiFilter: false,
    region: "US",
    defaultCategoryKey: "startups",
  },
  // General tech news (filtered to AI-relevant). Global coverage → no region.
  {
    id: "techcrunch",
    name: "TechCrunch",
    category: "news",
    url: "https://techcrunch.com/feed/",
    aiFilter: true,
  },
  {
    id: "verge",
    name: "The Verge",
    category: "news",
    url: "https://www.theverge.com/rss/index.xml",
    aiFilter: true,
  },
  {
    id: "arstechnica",
    name: "Ars Technica",
    category: "news",
    url: "https://feeds.arstechnica.com/arstechnica/index",
    aiFilter: true,
  },
  {
    id: "venturebeat",
    name: "VentureBeat",
    category: "news",
    url: "https://venturebeat.com/feed/",
    aiFilter: true,
  },
  {
    id: "mit-tech-review",
    name: "MIT Technology Review",
    category: "news",
    url: "https://www.technologyreview.com/feed/",
    aiFilter: true,
  },
  {
    id: "crunchbase-news",
    name: "Crunchbase News",
    category: "vc",
    url: "https://news.crunchbase.com/feed/",
    aiFilter: true,
    defaultCategoryKey: "investments",
  },
  // Cloud & infra (filtered)
  {
    id: "cloudflare",
    name: "Cloudflare",
    category: "infra",
    url: "https://blog.cloudflare.com/rss/",
    aiFilter: true,
    region: "US",
    defaultCategoryKey: "cloud",
  },
  {
    id: "aws",
    name: "AWS",
    category: "cloud",
    url: "https://aws.amazon.com/blogs/aws/feed/",
    aiFilter: true,
    region: "US",
    defaultCategoryKey: "cloud",
  },
  {
    id: "google-cloud",
    name: "Google Cloud",
    category: "cloud",
    url: "https://cloudblog.withgoogle.com/rss/",
    aiFilter: true,
    region: "US",
    defaultCategoryKey: "cloud",
  },
  // Developer community (filtered)
  {
    id: "stackoverflow",
    name: "Stack Overflow Blog",
    category: "dev",
    url: "https://stackoverflow.blog/feed/",
    aiFilter: true,
    defaultCategoryKey: "developer-tools",
  },
  // Regional AI/tech news (English-language, verified live 2026-07-21) — coverage beyond the US-centric
  // feeds above, so the News map/filters populate for China, India, Europe (incl. Germany), and Japan.
  // Filtered to AI-relevant items; region tags the source so non-US activity surfaces.
  {
    id: "pandaily",
    name: "Pandaily",
    category: "news",
    url: "https://pandaily.com/feed/",
    aiFilter: true,
    region: "CHINA",
  },
  {
    id: "inc42",
    name: "Inc42",
    category: "vc",
    url: "https://inc42.com/feed/",
    aiFilter: true,
    region: "INDIA",
  },
  {
    id: "thenextweb",
    name: "The Next Web",
    category: "news",
    url: "https://thenextweb.com/feed",
    aiFilter: true,
    region: "EUROPE",
  },
  {
    id: "sifted",
    name: "Sifted",
    category: "vc",
    url: "https://sifted.eu/feed",
    aiFilter: true,
    region: "EUROPE",
  },
  // Japan via Google News RSS (news.google.com/rss) — Google's OFFICIAL syndication endpoint, built for
  // feed readers, so it serves the GitHub-Actions runner where publisher feeds (The Bridge, Japan Times,
  // Nikkei) 403 the datacenter IP. The query is AI+Japan-scoped, so aiFilter is off (the query is the
  // filter) and every item is Japan-tagged. We store only headline metadata + a link back to the source.
  {
    id: "gnews-japan-ai",
    name: "Google News · Japan AI",
    category: "news",
    url: "https://news.google.com/rss/search?q=(AI%20OR%20%22artificial%20intelligence%22)%20Japan%20when:14d&hl=en-US&gl=US&ceid=US:en",
    aiFilter: false,
    region: "JAPAN",
  },
  // Korea + Singapore (English, verified live through the connector 2026-07-22). Broad publishers →
  // aiFilter keeps only AI-relevant items.
  {
    id: "koreatimes",
    name: "The Korea Times",
    category: "news",
    url: "https://www.koreatimes.co.kr/www/rss/rss.xml",
    aiFilter: true,
    region: "SOUTH_KOREA",
  },
  {
    id: "businesskorea",
    name: "BusinessKorea",
    category: "news",
    url: "https://www.businesskorea.co.kr/rss/allArticle.xml",
    aiFilter: true,
    region: "SOUTH_KOREA",
  },
  {
    id: "vulcanpost",
    name: "Vulcan Post",
    category: "news",
    url: "https://vulcanpost.com/feed/",
    aiFilter: true,
    region: "SINGAPORE",
  },
];

const USER_AGENT = "AIOIBot/1.0 (+https://ai-opportunity-intelligence.example; ingestion)";

/**
 * AI-relevance keywords for filtered feeds. Matched with word boundaries so short tokens like "ai" or
 * "ml" don't fire on "email", "maintain", "html", etc.
 */
export const AI_KEYWORDS = [
  "ai",
  "a\\.i\\.",
  "artificial intelligence",
  "machine learning",
  "ml",
  "llm",
  "gpt",
  "genai",
  "chatgpt",
  "openai",
  "anthropic",
  "claude",
  "gemini",
  "llama",
  "mistral",
  "deepmind",
  "hugging ?face",
  "agent",
  "agentic",
  "rag",
  "chatbot",
  "neural",
  "transformer",
  "diffusion",
  "inference",
  "embedding",
  "fine-?tune",
  "copilot",
  "prompt",
  "model", // "language model", "foundation model" — broad but on-topic for these feeds
];

const AI_REGEX = new RegExp(`\\b(?:${AI_KEYWORDS.join("|")})\\b`, "i");

export function looksAiRelevant(text: string): boolean {
  return AI_REGEX.test(text);
}

export interface RssFetchDeps {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  maxRetries?: number;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function getText(url: string, deps: Required<RssFetchDeps>): Promise<string> {
  let attempt = 0;
  for (;;) {
    const res = await deps.fetchImpl(url, {
      headers: {
        accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
        "user-agent": USER_AGENT,
      },
    });
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= deps.maxRetries)
        throw new Error(`RSS fetch failed ${res.status} after ${attempt} retries`);
      const retryAfter = Number(res.headers.get("retry-after"));
      const backoff =
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 400;
      await deps.sleep(backoff + Math.floor(Math.random() * 150));
      attempt += 1;
      continue;
    }
    if (!res.ok) throw new Error(`RSS fetch failed ${res.status}`);
    return await res.text();
  }
}

function fromCharRef(code: number): string {
  try {
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
  } catch {
    return "";
  }
}

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ") // strip any embedded HTML tags
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => fromCharRef(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => fromCharRef(parseInt(d, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

const firstTag = (block: string, name: string): string | undefined => {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  const v = m ? decode(m[1]!) : undefined;
  return v ? v : undefined;
};

/** RSS `<link>` carries the URL as text; Atom `<link href="…">` carries it in an attribute. */
function extractLink(block: string): string | undefined {
  const text = firstTag(block, "link");
  if (text && /^https?:\/\//i.test(text)) return text;
  // Atom: prefer rel="alternate", else the first link with an href.
  const links = [...block.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
  const alt = links.find((l) => /rel=["']?alternate/i.test(l)) ?? links[0];
  const href = alt?.match(/href=["']([^"']+)["']/i);
  return href ? decode(href[1]!) : undefined;
}

export interface RssItem {
  id: string;
  title: string;
  link?: string;
  summary?: string;
  published?: string;
}

/** Parse both RSS `<item>` and Atom `<entry>` blocks into a common shape. Feed-level tags are ignored. */
export function parseFeed(xml: string): RssItem[] {
  const blocks = xml.match(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi) ?? [];
  const items: RssItem[] = [];
  for (const b of blocks) {
    const title = firstTag(b, "title");
    if (!title) continue;
    const link = extractLink(b);
    const guid = firstTag(b, "guid") ?? firstTag(b, "id"); // RSS guid / Atom id
    const id = guid ?? link ?? title;
    const summary = firstTag(b, "description") ?? firstTag(b, "summary") ?? firstTag(b, "content");
    const published = firstTag(b, "pubDate") ?? firstTag(b, "published") ?? firstTag(b, "updated");
    items.push({ id, title, link, summary, published });
  }
  return items;
}

const rssItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  link: z.string().url().optional(),
  summary: z.string().optional(),
  published: z.string().optional(),
});

/**
 * Normalize a parsed item to a SourceRecord, or null if it fails validation or — for a filtered feed —
 * isn't AI-relevant. The record's source is the per-feed key (`rss:<id>`).
 */
export function normalize(feed: RssFeed, item: RssItem): SourceRecord | null {
  const parsed = rssItemSchema.safeParse(item);
  if (!parsed.success) return null;
  const it = parsed.data;
  const text = [it.title, it.summary].filter(Boolean).join(" ").trim();
  if (feed.aiFilter && !looksAiRelevant(text)) return null;
  return {
    source: rssSourceKey(feed.id),
    externalId: it.id,
    url: it.link,
    title: it.title,
    publishedAt: it.published,
    text,
    raw: { ...it, feed: feed.id, publisher: feed.name, category: feed.category },
    region: feed.region,
    defaultCategoryKey: feed.defaultCategoryKey,
  };
}

export interface RssIngestResult {
  records: SourceRecord[];
  skipped: number;
}

/** Fetch + parse + normalize one feed. Errors bubble up so the caller can record a failed run per feed. */
export async function fetchFeed(feed: RssFeed, deps: RssFetchDeps = {}): Promise<RssIngestResult> {
  const resolved = {
    fetchImpl: deps.fetchImpl ?? fetch,
    sleep: deps.sleep ?? defaultSleep,
    maxRetries: deps.maxRetries ?? 3,
  };
  const xml = await getText(feed.url, resolved);
  const records: SourceRecord[] = [];
  let skipped = 0;
  for (const item of parseFeed(xml)) {
    const record = normalize(feed, item);
    if (record) records.push(record);
    else skipped += 1;
  }
  return { records, skipped };
}
