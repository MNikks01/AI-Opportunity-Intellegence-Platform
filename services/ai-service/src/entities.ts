/**
 * Entity extraction (B-006 follow-up): find the well-known AI companies / models / tools / protocols
 * that recur across trends and link them. High-precision keyword matching against a curated dictionary
 * (deterministic, testable, no LLM). Extend the dictionary over time; an LLM pass is a future upgrade.
 */
import {
  type EntityType,
  listTrendsForEntityExtraction,
  upsertEntity,
  linkTrendEntity,
} from "@aioi/database";
import { logger } from "@aioi/logger";

interface EntityDef {
  name: string;
  type: EntityType;
  aliases: string[];
}

/** Curated, mostly-specific aliases to keep the directory clean. */
const AI_ENTITIES: EntityDef[] = [
  // Companies / labs
  { name: "OpenAI", type: "COMPANY", aliases: ["openai"] },
  { name: "Anthropic", type: "COMPANY", aliases: ["anthropic"] },
  { name: "Google DeepMind", type: "COMPANY", aliases: ["deepmind", "google deepmind"] },
  { name: "Meta AI", type: "COMPANY", aliases: ["meta ai"] },
  { name: "Microsoft", type: "COMPANY", aliases: ["microsoft"] },
  { name: "Mistral AI", type: "COMPANY", aliases: ["mistral ai"] },
  { name: "Cohere", type: "COMPANY", aliases: ["cohere"] },
  { name: "xAI", type: "COMPANY", aliases: ["xai"] },
  { name: "DeepSeek", type: "COMPANY", aliases: ["deepseek"] },
  { name: "Hugging Face", type: "COMPANY", aliases: ["hugging face", "huggingface"] },
  { name: "Stability AI", type: "COMPANY", aliases: ["stability ai"] },
  { name: "Perplexity", type: "COMPANY", aliases: ["perplexity"] },
  { name: "NVIDIA", type: "COMPANY", aliases: ["nvidia"] },
  { name: "Databricks", type: "COMPANY", aliases: ["databricks"] },
  { name: "Groq", type: "COMPANY", aliases: ["groq"] },
  { name: "Together AI", type: "COMPANY", aliases: ["together ai"] },
  { name: "ElevenLabs", type: "COMPANY", aliases: ["elevenlabs", "eleven labs"] },
  { name: "Midjourney", type: "COMPANY", aliases: ["midjourney"] },
  // Models
  { name: "GPT-4", type: "MODEL", aliases: ["gpt-4", "gpt4", "gpt-4o", "gpt-4-turbo"] },
  { name: "GPT-5", type: "MODEL", aliases: ["gpt-5", "gpt5"] },
  { name: "Claude", type: "MODEL", aliases: ["claude"] },
  { name: "Gemini", type: "MODEL", aliases: ["gemini"] },
  {
    name: "Llama",
    type: "MODEL",
    aliases: ["llama", "llama 3", "llama-3", "llama3", "meta-llama"],
  },
  { name: "Mistral", type: "MODEL", aliases: ["mistral", "mixtral"] },
  { name: "DeepSeek-R1", type: "MODEL", aliases: ["deepseek-r1", "deepseek r1"] },
  { name: "Qwen", type: "MODEL", aliases: ["qwen"] },
  { name: "Gemma", type: "MODEL", aliases: ["gemma"] },
  { name: "Phi", type: "MODEL", aliases: ["phi-3", "phi-4"] },
  { name: "Stable Diffusion", type: "MODEL", aliases: ["stable diffusion"] },
  { name: "Whisper", type: "MODEL", aliases: ["openai whisper"] },
  { name: "Sora", type: "MODEL", aliases: ["openai sora"] },
  { name: "FLUX", type: "MODEL", aliases: ["flux.1", "flux 1"] },
  // Tools / frameworks / protocols
  { name: "LangChain", type: "TOOL", aliases: ["langchain"] },
  { name: "LlamaIndex", type: "TOOL", aliases: ["llamaindex", "llama index"] },
  { name: "LangGraph", type: "TOOL", aliases: ["langgraph"] },
  { name: "Ollama", type: "TOOL", aliases: ["ollama"] },
  { name: "vLLM", type: "TOOL", aliases: ["vllm"] },
  { name: "PyTorch", type: "TOOL", aliases: ["pytorch"] },
  { name: "Pinecone", type: "TOOL", aliases: ["pinecone"] },
  { name: "Weaviate", type: "TOOL", aliases: ["weaviate"] },
  { name: "GitHub Copilot", type: "TOOL", aliases: ["github copilot"] },
  { name: "Cursor", type: "TOOL", aliases: ["cursor ide", "cursor editor"] },
  {
    name: "Model Context Protocol",
    type: "MCP_SERVER",
    aliases: ["model context protocol", "mcp server"],
  },
];

function aliasPattern(alias: string): RegExp {
  const esc = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // token match: not flanked by another alphanumeric (so "llama-3" ≠ "llama", "gpt-4" ≠ "gpt-4o")
  return new RegExp(`(?<![a-z0-9])${esc}(?![a-z0-9])`, "i");
}

const COMPILED = AI_ENTITIES.map((e) => ({
  name: e.name,
  type: e.type,
  patterns: e.aliases.map(aliasPattern),
}));

/** Distinct known entities mentioned in the given text. */
export function extractEntities(text: string): { name: string; type: EntityType }[] {
  const found = new Map<string, { name: string; type: EntityType }>();
  for (const e of COMPILED) {
    if (e.patterns.some((p) => p.test(text))) {
      found.set(`${e.type}:${e.name}`, { name: e.name, type: e.type });
    }
  }
  return [...found.values()];
}

/** Extract + link entities for trends that don't have any yet (newest first). */
export async function extractEntitiesForTrends(
  opts: { limit?: number } = {},
): Promise<{ trends: number; links: number }> {
  const trends = await listTrendsForEntityExtraction(opts.limit ?? 200);
  let links = 0;
  for (const t of trends) {
    for (const e of extractEntities(t.text)) {
      try {
        const entityId = await upsertEntity(e.type, e.name);
        await linkTrendEntity(t.id, entityId);
        links += 1;
      } catch (err) {
        logger.warn({ err, trendId: t.id, entity: e.name }, "entity link failed (skipped)");
      }
    }
  }
  logger.info({ trends: trends.length, links }, "entity extraction complete");
  return { trends: trends.length, links };
}
