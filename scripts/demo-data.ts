/**
 * Populate a (demo) database with real trends: ingest the three keyless sources → cluster → score.
 * Scoring uses the Stub unless OPENAI_API_KEY (+ LITELLM_BASE_URL) are set, in which case it's real.
 * Run: DATABASE_URL=… [APP_DATABASE_URL=…] pnpm exec tsx scripts/demo-data.ts
 */
import {
  runHackerNewsIngestion,
  runGitHubIngestion,
  runHuggingFaceIngestion,
} from "../services/ingestion-service/src/index";
import { clusterRecentSignals, scoreClusteredTrends } from "../services/ai-service/src/index";

async function main() {
  console.log("ingesting (HackerNews, GitHub, Hugging Face)…");
  console.log("  hackernews:", await runHackerNewsIngestion(40));
  console.log("  github:", await runGitHubIngestion(20));
  console.log("  huggingface:", await runHuggingFaceIngestion(20));

  console.log("clustering…", await clusterRecentSignals());
  console.log("scoring…", await scoreClusteredTrends({ limit: 50 }));
  console.log("done — the demo DB now has scored trends.");
  process.exit(0);
}

main().catch((e: unknown) => {
  console.error("demo-data failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
