/**
 * Opt-in backfill re-score: upgrade existing (Stub-era) trend scores to the configured real model.
 * The autonomous cron only scores NEW trends, so this is the one-time path to re-score the backlog.
 * Batched + queue-rotating (stalest first): run it repeatedly until it has covered the set.
 *
 * Relative imports (not "@aioi/*"): this lives at the repo root, which has no @aioi dependency.
 *
 * Usage (a real provider is required — it refuses to run on the Stub):
 *   DATABASE_URL=… LITELLM_BASE_URL=https://api.openai.com/v1 AIOI_LLM_API_KEY=sk-… \
 *     pnpm rescore [batchSize]        # default 25
 *   RESCORE_DRY=1 … pnpm rescore      # estimate cost only, no scoring / no spend
 *   RESCORE_FORCE=1 … pnpm rescore    # allow the Stub (e.g. local dry mechanics)
 */
import { getProvider } from "../packages/ai-sdk/src/index";
import { countScoredTrends } from "../packages/database/src/index";
import { rescoreTrends } from "../services/ai-service/src/index";

const DIMENSIONS = 10; // model calls per trend (one per scored dimension)

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }
  const batch = Math.max(
    1,
    Number.parseInt(process.argv[2] ?? process.env.RESCORE_BATCH ?? "25", 10) || 25,
  );
  const provider = getProvider();
  const total = await countScoredTrends();

  if (process.env.RESCORE_DRY) {
    console.log(
      `[dry run] ${total} scored trends · provider "${provider.name}". A full backfill is ` +
        `~${total * DIMENSIONS} model calls across ${Math.ceil(total / batch)} batches of ${batch}.`,
    );
    process.exit(0);
  }

  if (provider.name === "stub" && !process.env.RESCORE_FORCE) {
    console.error(
      "Provider is the Stub — re-scoring would just rewrite heuristic scores. Set LITELLM_BASE_URL " +
        "+ AIOI_LLM_API_KEY (or OPENAI_API_KEY) for a real model, or RESCORE_FORCE=1 to override.",
    );
    process.exit(1);
  }

  console.log(`Re-scoring up to ${batch} trends with "${provider.name}" (${total} scored total)…`);
  const res = await rescoreTrends({ limit: batch, provider });
  console.log(
    `Done: re-scored ${res.rescored}/${res.picked}. Run again to continue — ` +
      `~${Math.ceil(res.totalScored / batch)} batches cover the ${res.totalScored} scored trends.`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
