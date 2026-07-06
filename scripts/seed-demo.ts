/**
 * Seed a scored trend into Postgres so the API/UI have real data.
 * Run: DATABASE_URL=... pnpm exec tsx scripts/seed-demo.ts
 */
import { scoreTrend } from "../services/ai-service/src/index";
import { StubProvider } from "../packages/ai-sdk/src/index";
import { persistScoredTrend } from "../packages/database/src/index";
import type { TrendLike } from "../packages/shared/src/index";

const trend: TrendLike = {
  id: "seed",
  slug: "mcp-servers-for-local-models",
  title: "MCP servers for local models",
  summary:
    "Model Context Protocol server implementations for local LLMs surged this week across GitHub and HN.",
  status: "ACTIVE",
  signals: [
    {
      source: "hackernews",
      externalId: "seed-hn-1",
      title: "Show HN: local MCP server",
      text: "MCP for local LLMs is taking off",
    },
    {
      source: "github",
      externalId: "seed-gh-1",
      title: "awesome-mcp-local",
      text: "1.2k stars this week for a local MCP server",
    },
    {
      source: "github",
      externalId: "seed-gh-2",
      title: "mcp-runtime",
      text: "runtime to host MCP tools on-device",
    },
  ],
};

async function main() {
  // Seed with the deterministic Stub so it always works offline — no LLM/keys required. (Real
  // scoring runs in the pipeline; re-embed later with scripts/reembed-trends.ts once a key is set.)
  const scores = await scoreTrend(trend, { provider: new StubProvider() });
  const id = await persistScoredTrend(trend, scores);
  console.warn(`Seeded trend ${trend.slug} (${id}) with ${scores.length} scores.`);
  process.exit(0);
}

main().catch((e) => {
  console.error("seed failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
