/**
 * Natural-language query parsing (M5). Turns a search phrase like "open source models released this week"
 * or "AI funding over $50M in Europe" into structured filters + the semantic text to embed. Pure and
 * deterministic (no LLM) — deliberately cheap, since search runs on every keystroke-ish request. The
 * semantic vector does the fuzzy matching; this just extracts the hard filters the SQL can apply.
 */
import type { Region } from "./taxonomy";

export interface ParsedQuery {
  /** The text to embed for semantic ranking (original, trimmed). */
  text: string;
  region?: Region;
  categoryKey?: string;
  openSource?: boolean;
  /** Recency window in days (today = 1, this week = 7, …). */
  sinceDays?: number;
  /** Funding threshold in USD, parsed from "$50M" / "$1.2B". Hints the investments category. */
  minFundingUsd?: number;
}

/** Region names as they appear in queries (the enum's company keywords live in relevance.ts). */
const REGION_NAMES: [RegExp, Region][] = [
  [/\b(united states|u\.?s\.?a?|america)\b/i, "US"],
  [/\b(china|chinese)\b/i, "CHINA"],
  [/\b(india|indian)\b/i, "INDIA"],
  [/\b(europe|european|\beu\b)\b/i, "EUROPE"],
  [/\b(japan|japanese)\b/i, "JAPAN"],
  [/\b(south korea|korea|korean)\b/i, "SOUTH_KOREA"],
  [/\b(singapore)\b/i, "SINGAPORE"],
  [/\b(canada|canadian)\b/i, "CANADA"],
  [/\b(australia|australian)\b/i, "AUSTRALIA"],
];

/** Query words → category key. Ordered: earlier, more-specific patterns win. */
const CATEGORY_WORDS: [RegExp, string][] = [
  [/\b(coding|code)\b/i, "coding-ai"],
  [/\bvideo\b/i, "video-ai"],
  [/\bimage\b/i, "image-ai"],
  [/\b(voice|speech|tts)\b/i, "voice-ai"],
  [/\b(agent|agents|agentic)\b/i, "ai-agents"],
  [/\b(robot|robots|robotics|humanoid)\b/i, "robotics"],
  [/\b(fund|funding|raise|raised|investment|ipo|acquisition|valuation)\b/i, "investments"],
  [/\b(startup|startups)\b/i, "startups"],
  [/\b(paper|papers|arxiv|research)\b/i, "research-papers"],
  [/\b(hardware|chip|chips|gpu|gpus)\b/i, "hardware"],
  [/\b(cloud)\b/i, "cloud"],
  [/\b(presentation|slides)\b/i, "presentation-ai"],
  [/\b(model|models|llm|llms)\b/i, "ai-models"],
];

function parseTimeframe(q: string): number | undefined {
  if (/\btoday\b/i.test(q)) return 1;
  if (/\byesterday\b/i.test(q)) return 2;
  if (/\b(this week|past week|last week|last 7 days)\b/i.test(q)) return 7;
  if (/\b(this month|past month|last month|last 30 days)\b/i.test(q)) return 30;
  if (/\b(this year|past year|last year)\b/i.test(q)) return 365;
  return undefined;
}

function parseFunding(q: string): number | undefined {
  const m = q.match(/\$\s?(\d+(?:\.\d+)?)\s*([mbk])\b/i);
  if (!m) return undefined;
  const n = Number(m[1]);
  const unit = m[2]!.toLowerCase();
  const mult = unit === "b" ? 1e9 : unit === "m" ? 1e6 : 1e3;
  return n * mult;
}

/** Parse a natural-language search query into filters + semantic text. Never throws. */
export function parseNlQuery(nl: string): ParsedQuery {
  const text = nl.trim();
  const parsed: ParsedQuery = { text };

  for (const [re, region] of REGION_NAMES) {
    if (re.test(text)) {
      parsed.region = region;
      break;
    }
  }
  for (const [re, key] of CATEGORY_WORDS) {
    if (re.test(text)) {
      parsed.categoryKey = key;
      break;
    }
  }

  const sinceDays = parseTimeframe(text);
  if (sinceDays !== undefined) parsed.sinceDays = sinceDays;

  if (/\bopen[- ]?source\b/i.test(text)) parsed.openSource = true;

  const funding = parseFunding(text);
  if (funding !== undefined) {
    parsed.minFundingUsd = funding;
    parsed.categoryKey ??= "investments";
  }

  return parsed;
}
