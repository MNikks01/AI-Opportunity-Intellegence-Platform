import { apiJson } from "./_lib";
import { getSiteUrl } from "../../lib/site";

export const dynamic = "force-dynamic";

/** Self-documenting index for the public read API. */
export async function GET() {
  const base = getSiteUrl();
  return apiJson({
    name: "AI Opportunity Intelligence — public API",
    version: "v1",
    endpoints: {
      "GET /api/v1/trends": "Scored trends. Query: limit (≤100), source, sort (a score dimension).",
      "GET /api/v1/trends/{slug}": "One trend: scores, momentum, entities, and its build plan.",
      "GET /api/v1/opportunities":
        "The Golden-Quadrant 'build now' list (high demand, low supply).",
      "GET /api/v1/search": "Keyword search over scored trends. Query: q, limit (≤100).",
      "GET /api/v1/news":
        "AI/tech news feed. Query: q (hybrid search), region, category, minOpportunity, sinceDays, sort (recent|opportunity|impact|trending), limit (≤100).",
      "GET /api/v1/news/{id}":
        "One news item with its full analysis (TLDR, 9 opportunity axes, actions).",
      "GET /api/v1/categories": "The AI/tech content taxonomy (category keys + names).",
      "GET /api/v1/models":
        "Open-source model tracker (license, params, GGUF/Ollama/vLLM). Query: gguf, paramsMin, limit.",
      "GET /api/v1/entities":
        "Tracked supply-side entities (models/MCP/repos) with momentum. Query: sort, limit.",
      "GET /api/v1/entities/lookup":
        "Look up a tracked entity (model/MCP/repo) by exact name. Query: name.",
      "GET /api/v1/funding": "Recent AI funding events (SEC EDGAR + Crunchbase). Query: limit.",
    },
    auth: "Optional. Send 'Authorization: Bearer aioi_…' to raise the per-request limit (25 → 100) and a plan-based daily quota (Free 1,000/day, Pro 50,000/day). Create keys under Team.",
    docs: `${base}`,
  });
}
