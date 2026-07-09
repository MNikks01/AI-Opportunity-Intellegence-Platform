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
    },
    auth: "Optional. Send 'Authorization: Bearer aioi_…' to raise the per-request limit (25 → 100) and get a 1,000/day quota. Create keys under Team.",
    docs: `${base}`,
  });
}
