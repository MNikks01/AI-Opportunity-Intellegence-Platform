/**
 * Re-embed every trend with the currently-configured embedder. Run after switching on a real embed
 * model (set OPENAI_API_KEY + LITELLM_BASE_URL) so trends created with the Stub become semantically
 * searchable / cluster semantically.
 * Run: DATABASE_URL=... APP_DATABASE_URL=... pnpm exec tsx scripts/reembed-trends.ts
 */
import { reembedAllTrends } from "../packages/database/src/index";

reembedAllTrends()
  .then((r) => {
    console.log(`Re-embedded ${r.embedded}/${r.total} trends.`);
    process.exit(0);
  })
  .catch((e: unknown) => {
    console.error("reembed failed:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
