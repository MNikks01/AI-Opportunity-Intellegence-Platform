/**
 * Critical-path demo (Phase 23): real Hacker News ingestion -> Trend -> eval-gated scorecard.
 * Run: pnpm exec tsx scripts/demo-slice.ts
 * Uses the deterministic stub scorer unless LITELLM_BASE_URL + a provider key are set.
 */
import { fetchTopStories, InMemorySignalRepository } from "../services/ingestion-service/src/index";
import { scoreTrend } from "../services/ai-service/src/index";
import type { TrendLike } from "../packages/shared/src/index";

async function main() {
  console.log("→ Ingesting Hacker News (top 5)…");
  const { records, skipped } = await fetchTopStories(5);
  const repo = new InMemorySignalRepository();
  const inserted = await repo.upsertMany(records);
  console.log(`  fetched=${records.length} inserted=${inserted} skipped=${skipped}`);

  const top = records[0];
  if (!top) throw new Error("no records ingested");

  // Minimal clustering for the demo: treat the top story (+ its neighbours) as one trend.
  const trend: TrendLike = {
    id: "demo-trend",
    slug: "demo-trend",
    title: top.title ?? "Untitled",
    status: "ACTIVE",
    signals: records.slice(0, 3).map((r) => ({
      source: r.source,
      externalId: r.externalId,
      url: r.url,
      title: r.title,
      text: r.text,
    })),
  };

  console.log(`\n→ Scoring trend: "${trend.title}"`);
  const scores = await scoreTrend(trend);
  for (const s of scores) {
    const inverted = ["competition", "risk", "difficulty"].includes(s.dimension) ? " (high=worse)" : "";
    console.log(
      `  ${s.dimension.padEnd(18)} ${String(s.value).padStart(3)}  ${s.band.padEnd(6)} conf ${s.confidence}${inverted}`,
    );
  }
  const opp = scores.find((s) => s.dimension === "opportunity");
  console.log(`\n✓ Opportunity ${opp?.value} (${opp?.band}) — composed from ${opp?.composedFrom?.length} sub-dimensions.`);
}

main().catch((e) => {
  console.error("demo failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
