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
      "GET /api/v1/entities/lookup":
        "Look up a tracked entity (model/MCP/repo) by exact name. Query: name.",
    },
    auth: "Optional. Send 'Authorization: Bearer aioi_…' to raise the per-request limit (25 → 100) and a plan-based daily quota (Free 1,000/day, Pro 50,000/day). Create keys under Team.",
    docs: `${base}`,
  });
}
