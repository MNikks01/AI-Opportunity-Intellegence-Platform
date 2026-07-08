/**
 * Populate a (demo) database with real trends: ingest every configured source → cluster → score.
 * Key-gated sources (Reddit/Product Hunt/YouTube) no-op unless their keys are set, so this is safe to
 * run/schedule unconditionally. Scoring uses the Stub unless OPENAI_API_KEY (+ LITELLM_BASE_URL) or
 * AIOI_LLM_API_KEY are set, in which case it's real.
 * Run: DATABASE_URL=… [APP_DATABASE_URL=…] pnpm exec tsx scripts/demo-data.ts
 */
import {
  runHackerNewsIngestion,
  runGitHubIngestion,
  runHuggingFaceIngestion,
  runRedditIngestion,
  runProductHuntIngestion,
  runYouTubeIngestion,
} from "../services/ingestion-service/src/index";
import {
  clusterRecentSignals,
  scoreClusteredTrends,
  generateActionPlansForTopTrends,
} from "../services/ai-service/src/index";
import { bootstrapUser, generateDailyBrief } from "@aioi/database";

/** Run one source; a failure (bad key, rate limit) is logged and skipped so others still run. */
async function ingest(name: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    console.log(`  ${name}:`, await fn());
  } catch (e) {
    console.log(`  ${name}: skipped (${e instanceof Error ? e.message : String(e)})`);
  }
}

async function main() {
  console.log("ingesting (all configured sources)…");
  await ingest("hackernews", () => runHackerNewsIngestion(40));
  await ingest("github", () => runGitHubIngestion(20));
  await ingest("huggingface", () => runHuggingFaceIngestion(20));
  await ingest("reddit", () => runRedditIngestion(20));
  await ingest("producthunt", () => runProductHuntIngestion(20));
  await ingest("youtube", () => runYouTubeIngestion(20));

  console.log("clustering…", await clusterRecentSignals());
  console.log("scoring…", await scoreClusteredTrends({ limit: 50 }));
  console.log("action plans…", await generateActionPlansForTopTrends({ limit: 15 }));

  // Generate today's brief for the demo tenant so /briefs isn't empty on the live site.
  const { organizationId } = await bootstrapUser({
    clerkId: "dev-user",
    email: "dev@aioi.local",
    name: "Dev User",
  });
  const brief = await generateDailyBrief(organizationId);
  console.log("brief…", { id: brief.id });

  console.log("done — the demo DB now has scored trends, action plans, and a brief.");
  process.exit(0);
}

main().catch((e: unknown) => {
  console.error("demo-data failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
