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
  runArxivIngestion,
  runNpmIngestion,
  runPypiIngestion,
  runHnHiringIngestion,
  runSecEdgarIngestion,
} from "../services/ingestion-service/src/index";
import {
  clusterRecentSignals,
  scoreClusteredTrends,
  generateActionPlansForTopTrends,
  extractEntitiesForTrends,
} from "../services/ai-service/src/index";
import { deliverDigest, type DigestContent } from "../services/notification-service/src/index";
// Relative import (not the "@aioi/database" package name): this script lives at the repo root, which
// has no @aioi/* dependency, so the package isn't linked into the root node_modules and would fail to
// resolve under `tsx` in CI. The service imports above use the same relative style.
import {
  bootstrapUser,
  generateDailyBrief,
  recordTrendSnapshots,
  recordEntitySnapshots,
  syncSupplyEntities,
  evaluateEntityAlertsAllOrgs,
  getOrgIntegration,
  recordFailedIngestionRun,
} from "../packages/database/src/index";

/**
 * Run one source; a failure (bad key, rate limit, expired token) is logged, recorded as a FAILED
 * ingestion run (so /sources shows *why* it produced nothing), and skipped so other sources still run.
 */
async function ingest(name: string, fn: () => Promise<unknown>): Promise<void> {
  const startedAt = new Date();
  try {
    console.log(`  ${name}:`, await fn());
  } catch (e) {
    console.log(`  ${name}: skipped (${e instanceof Error ? e.message : String(e)})`);
    await recordFailedIngestionRun(name, e, startedAt);
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
  await ingest("arxiv", () => runArxivIngestion(30));
  await ingest("npm", () => runNpmIngestion(30));
  await ingest("pypi", () => runPypiIngestion());
  await ingest("hnhiring", () => runHnHiringIngestion());
  await ingest("sec-edgar", () => runSecEdgarIngestion()); // no-op unless SEC_USER_AGENT is set

  console.log("clustering…", await clusterRecentSignals());
  console.log("scoring…", await scoreClusteredTrends({ limit: 50 }));
  console.log(
    "entities…",
    await extractEntitiesForTrends({ limit: 200, useLlm: Boolean(process.env.AIOI_ENTITY_LLM) }),
  );
  console.log("action plans…", await generateActionPlansForTopTrends({ limit: 15 }));

  // Upsert supply-side entities (models / repos / MCP servers) directly from HF+GitHub signals.
  console.log("supply entities…", await syncSupplyEntities());

  // Record a history point so momentum/trajectory accrues run over run (demand + supply side).
  console.log("snapshots…", await recordTrendSnapshots());
  console.log("entity snapshots…", await recordEntitySnapshots());
  // Notify orgs whose watched entities (models / MCP / repos) are accelerating.
  console.log("entity alerts…", await evaluateEntityAlertsAllOrgs());

  // Generate today's brief for the demo tenant so /briefs isn't empty on the live site.
  const { organizationId } = await bootstrapUser({
    clerkId: "dev-user",
    email: "dev@aioi.local",
    name: "Dev User",
  });
  const brief = await generateDailyBrief(organizationId);
  console.log("brief…", { id: brief.id });

  // Deliver the digest — prefer the org's configured webhooks, falling back to env for the demo.
  const integration = await getOrgIntegration(organizationId);
  const slackWebhookUrl = integration?.slackWebhookUrl ?? process.env.SLACK_WEBHOOK_URL;
  const discordWebhookUrl = integration?.discordWebhookUrl ?? process.env.DISCORD_WEBHOOK_URL;
  const digestEnabled = integration ? integration.digestEnabled : true;
  if (digestEnabled && (slackWebhookUrl || discordWebhookUrl)) {
    const delivered = await deliverDigest({
      content: brief.content as unknown as DigestContent,
      slackWebhookUrl,
      discordWebhookUrl,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    });
    console.log("digest…", delivered);
  }

  console.log("done — the demo DB now has scored trends, action plans, and a brief.");
  process.exit(0);
}

main().catch((e: unknown) => {
  console.error("demo-data failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
