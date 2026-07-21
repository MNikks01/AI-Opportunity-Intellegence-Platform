/**
 * Relevance gate (M2) — the cheap, rules-based tier-1 filter that runs before any LLM spend (ADR-0009
 * cost guardrail). It answers three questions with keywords only: is this AI/tech-relevant, which
 * categories does it touch, and which region does it hint at. The LLM (M4) does the authoritative
 * classification; this just stops off-topic signals from ever reaching it. Pure, no network.
 */
import { isCategoryKey, type Region } from "./taxonomy";

/** Broad AI/tech vocabulary — any hit makes a signal a candidate for analysis. */
const AI_TECH_TERMS: readonly string[] = [
  "ai",
  "a.i.",
  "artificial intelligence",
  "machine learning",
  "ml",
  "llm",
  "large language model",
  "neural network",
  "deep learning",
  "transformer",
  "generative",
  "genai",
  "model",
  "inference",
  "gpu",
  "benchmark",
  "open source",
  "open-source",
  "agent",
  "embedding",
  "fine-tune",
  "fine-tuning",
  "rag",
  "multimodal",
];

/** Per-category keyword sets, seeded from the brief's examples. Substring-with-boundary matched. */
const CATEGORY_KEYWORDS: Record<string, readonly string[]> = {
  "ai-models": [
    "gpt",
    "claude",
    "gemini",
    "deepseek",
    "qwen",
    "kimi",
    "mistral",
    "grok",
    "llama",
    "phi",
    "gemma",
    "glm",
    "foundation model",
    "frontier model",
  ],
  "coding-ai": [
    "claude code",
    "cursor",
    "windsurf",
    "copilot",
    "gemini cli",
    "codex",
    "continue.dev",
    "cline",
    "roo code",
    "aider",
    "sourcegraph",
    "cody",
  ],
  "research-ai": ["notebooklm", "elicit", "perplexity", "scite", "consensus", "scispace"],
  "presentation-ai": ["gamma", "tome", "beautiful.ai", "canva ai", "napkin ai"],
  "video-ai": ["veo", "runway", "kling", "pika", "hailuo", "luma", "sora"],
  "image-ai": ["midjourney", "flux", "stable diffusion", "ideogram", "recraft", "dall-e", "dalle"],
  "voice-ai": ["elevenlabs", "cartesia", "openai voice", "sesame", "text-to-speech", "tts"],
  "ai-agents": [
    "manus",
    "autogpt",
    "crewai",
    "langgraph",
    "openai agents",
    "claude agents",
    "agentic",
  ],
  robotics: ["robot", "robotics", "humanoid", "boston dynamics", "figure ai", "tesla bot"],
  startups: ["startup", "seed round", "series a", "series b", "y combinator", "yc "],
  "big-tech": [
    "openai",
    "anthropic",
    "google",
    "meta",
    "microsoft",
    "apple",
    "amazon",
    "nvidia",
    "alibaba",
    "tencent",
    "bytedance",
    "xai",
  ],
  government: [
    "regulation",
    "policy",
    "ai act",
    "executive order",
    "national ai",
    "export control",
  ],
  investments: [
    "funding",
    "raised",
    "valuation",
    "ipo",
    "acquisition",
    "merger",
    "acquires",
    "series c",
  ],
  "open-source": [
    "huggingface",
    "hugging face",
    "github trending",
    "weights",
    "gguf",
    "apache 2.0",
    "mit license",
  ],
  "research-papers": ["arxiv", "papers with code", "preprint", "sota", "state of the art"],
  "developer-tools": [
    "framework",
    "sdk",
    "api",
    "mcp",
    "vector database",
    "agent framework",
    "langchain",
  ],
  cloud: ["aws", "azure", "google cloud", "gcp", "cloudflare", "vercel", "railway", "render"],
  hardware: [
    "nvidia",
    "amd",
    "intel",
    "apple silicon",
    "tpu",
    "ai chip",
    "h100",
    "b200",
    "blackwell",
  ],
};

/** Region hints from characteristic company/lab names. Best-effort; the LLM refines in M4. */
const REGION_KEYWORDS: Partial<Record<Region, readonly string[]>> = {
  US: ["openai", "anthropic", "google", "meta", "microsoft", "nvidia", "xai", "apple", "amazon"],
  CHINA: [
    "deepseek",
    "qwen",
    "alibaba",
    "tencent",
    "bytedance",
    "baidu",
    "kimi",
    "glm",
    "moonshot",
    "01.ai",
  ],
  INDIA: ["sarvam", "krutrim", "bengaluru", "bangalore"],
  EUROPE: ["mistral", "deepmind", "stability ai", "black forest labs", "aleph alpha"],
  JAPAN: ["sakana", "rinna", "preferred networks"],
  SOUTH_KOREA: ["naver", "kakao", "upstage", "lg ai"],
};

/** Case-insensitive presence of a term with non-alphanumeric boundaries (so "ai" ≠ "brain"). */
function hasTerm(haystack: string, term: string): boolean {
  const t = term.toLowerCase();
  let from = 0;
  for (;;) {
    const idx = haystack.indexOf(t, from);
    if (idx === -1) return false;
    const before = idx === 0 ? "" : (haystack[idx - 1] ?? "");
    const after = haystack[idx + t.length] ?? "";
    const boundary = (ch: string) => ch === "" || !/[a-z0-9]/.test(ch);
    if (boundary(before) && boundary(after)) return true;
    from = idx + t.length;
  }
}

export interface CategoryHit {
  key: string;
  /** Number of distinct keywords matched for this category. */
  hits: number;
}

export interface RelevanceResult {
  /** True when the signal is AI/tech-relevant and should proceed to enrichment. */
  relevant: boolean;
  /** 0–1 confidence, saturating as more independent signals match. */
  score: number;
  /** Categories the text touches, most-hit first. */
  categories: CategoryHit[];
  /** Best-effort region hint, if any characteristic name matched. */
  regionHint?: Region;
}

/**
 * Rules-based relevance + hinting over a title (+ optional body). Deterministic and cheap: no model
 * call. A signal is relevant if it matches any AI/tech term or any category keyword.
 */
export function classifyByRules(title: string, body = ""): RelevanceResult {
  const text = `${title} ${body}`.toLowerCase();

  const aiTermHits = AI_TECH_TERMS.reduce((n, t) => n + (hasTerm(text, t) ? 1 : 0), 0);

  const categories: CategoryHit[] = [];
  for (const [key, words] of Object.entries(CATEGORY_KEYWORDS)) {
    if (!isCategoryKey(key)) continue; // guard against registry drift
    const hits = words.reduce((n, w) => n + (hasTerm(text, w) ? 1 : 0), 0);
    if (hits > 0) categories.push({ key, hits });
  }
  categories.sort((a, b) => b.hits - a.hits);

  let regionHint: Region | undefined;
  let best = 0;
  for (const [region, words] of Object.entries(REGION_KEYWORDS) as [Region, readonly string[]][]) {
    const hits = words.reduce((n, w) => n + (hasTerm(text, w) ? 1 : 0), 0);
    if (hits > best) {
      best = hits;
      regionHint = region;
    }
  }

  const totalSignals = aiTermHits + categories.reduce((n, c) => n + c.hits, 0);
  const relevant = totalSignals > 0;
  // Saturating score: 3+ independent signals ⇒ ~1.0.
  const score = relevant ? Math.min(1, totalSignals / 3) : 0;

  return { relevant, score, categories, regionHint };
}
