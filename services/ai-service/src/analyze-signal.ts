/**
 * Per-article analysis (AI/tech vertical, M4 — ADR-0009). Turns raw Signals into the SignalAnalysis
 * enrichment: TLDR, the nine opportunity axes, categories, region, and action items.
 *
 * Cost guardrails, in order, so we never spend more than necessary:
 *   1. relevance gate  — rules-only (classifyByRules); off-topic signals never reach the model;
 *   2. content-hash cache — an identical article (even reposted) reuses an existing analysis;
 *   3. budget cap      — at most `budget` model calls per run; the rest defer to the next pass.
 *
 * All model calls go through @aioi/ai-sdk. The prompt is versioned; a bump re-analyzes on next run.
 */
import { getProvider, type LLMProvider } from "@aioi/ai-sdk";
import {
  classifyByRules,
  contentHash as hashContent,
  detectLanguage,
  CATEGORY_REGISTRY,
} from "@aioi/intel-core";
import {
  listSignalsForAnalysis,
  findAnalysisByContentHash,
  upsertSignalAnalysis,
  evaluateSignalAllOrgs,
  type SignalForAnalysis,
  type SignalAnalysisInput,
} from "@aioi/database";
import { logger } from "@aioi/logger";
import type { SignalAnalysisContent } from "@aioi/validation";

/** Bump to force re-analysis of every signal on the next run (cache is keyed on this). */
export const ANALYSIS_PROMPT_VERSION = "signal-analysis-v1";

const VALID_CATEGORY_KEYS = CATEGORY_REGISTRY.map((c) => c.key);

/** Pull the analyzable text out of a signal: title + the source's summary/description, when present. */
export function signalBody(signal: Pick<SignalForAnalysis, "title" | "raw">): string {
  const parts = [signal.title ?? ""];
  const raw = signal.raw;
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    for (const key of ["summary", "text", "description", "content"]) {
      if (typeof r[key] === "string") parts.push(r[key] as string);
    }
  }
  return parts.filter(Boolean).join(" ").trim();
}

/** Source-tier + relevance → a 1..100 credibility score. Deterministic; official sources rank highest. */
export function credibilityScore(
  legalityTier: string,
  relevance: number,
  modelConfidence: number,
): number {
  const base: Record<string, number> = { OFFICIAL: 72, LICENSED: 78, GRAY: 45, PROHIBITED: 15 };
  const raw =
    (base[legalityTier] ?? 50) +
    Math.round(relevance * 15) +
    Math.round((modelConfidence - 0.5) * 20);
  return Math.max(1, Math.min(100, raw));
}

/** Compose the persistable analysis row from the model output + the rules gate (pure; no DB/LLM). */
export function buildAnalysisInput(
  signal: SignalForAnalysis,
  content: SignalAnalysisContent,
  gate: ReturnType<typeof classifyByRules>,
  body: string,
): SignalAnalysisInput {
  // Prefer the model's region; fall back to the gate hint, then the source's default, then OTHER.
  const region =
    content.region !== "OTHER"
      ? content.region
      : (gate.regionHint ?? signal.sourceRegion ?? "OTHER");

  return {
    signalId: signal.id,
    region,
    language: detectLanguage(body),
    tldr: content.tldr,
    payload: content,
    impactScore: content.impactScore,
    opportunityScore: content.opportunityScore,
    credibilityScore: credibilityScore(signal.legalityTier, gate.score, content.confidence),
    contentHash: hashContent(signal.title ?? "", body),
    promptVersion: ANALYSIS_PROMPT_VERSION,
    categories: content.categories,
  };
}

export type AnalyzeOutcome = "analyzed" | "cache-hit" | "skipped-irrelevant" | "deferred-budget";

export interface AnalyzeSignalsResult {
  seen: number;
  analyzed: number;
  cacheHits: number;
  skipped: number;
  deferred: number;
  llmCalls: number;
}

export interface AnalyzeSignalsOptions {
  limit?: number;
  /** Max model calls this run (cost cap). Cache hits and skips don't count against it. */
  budget?: number;
  provider?: LLMProvider;
}

/**
 * Analyze the backlog of un-analyzed signals under the guardrails above. Returns per-outcome counts so a
 * caller (scheduler/worker) can log cost + coverage. A failure on one signal is logged and skipped —
 * it never fails the batch.
 */
export async function analyzeSignals(
  opts: AnalyzeSignalsOptions = {},
): Promise<AnalyzeSignalsResult> {
  const limit = opts.limit ?? 50;
  const budget = opts.budget ?? 25;
  const provider = opts.provider ?? getProvider();
  const signals = await listSignalsForAnalysis(limit);

  const result: AnalyzeSignalsResult = {
    seen: signals.length,
    analyzed: 0,
    cacheHits: 0,
    skipped: 0,
    deferred: 0,
    llmCalls: 0,
  };

  for (const signal of signals) {
    const body = signalBody(signal);
    const gate = classifyByRules(signal.title ?? "", body);

    // Guardrail 1: relevance gate (rules only, no spend).
    if (!gate.relevant) {
      result.skipped += 1;
      continue;
    }

    const contentHash = hashContent(signal.title ?? "", body);

    // Guardrail 2: content-hash cache — reuse an identical article's analysis.
    const cached = await findAnalysisByContentHash(contentHash, ANALYSIS_PROMPT_VERSION, signal.id);
    if (cached) {
      await upsertSignalAnalysis({
        signalId: signal.id,
        region: cached.region,
        language: cached.language,
        tldr: cached.tldr,
        payload: cached.payload,
        impactScore: cached.impactScore,
        opportunityScore: cached.opportunityScore,
        credibilityScore: cached.credibilityScore,
        contentHash,
        promptVersion: ANALYSIS_PROMPT_VERSION,
        categories: (cached.payload as SignalAnalysisContent | null)?.categories ?? [],
      });
      result.cacheHits += 1;
      continue;
    }

    // Guardrail 3: budget cap — defer the rest to the next run.
    if (result.llmCalls >= budget) {
      result.deferred += 1;
      continue;
    }

    try {
      const content = await provider.analyzeSignal({
        title: signal.title ?? "",
        body,
        sourceKey: signal.sourceKey,
        url: signal.url ?? undefined,
        regionHint: gate.regionHint,
        categoryHints: gate.categories.map((c) => c.key),
        validCategoryKeys: VALID_CATEGORY_KEYS,
      });
      result.llmCalls += 1;
      const input = buildAnalysisInput(signal, content, gate, body);
      await upsertSignalAnalysis(input);
      result.analyzed += 1;
      // Best-effort news-alert fan-out (M8): notify orgs subscribed to this region/category.
      await evaluateSignalAllOrgs({
        signalId: signal.id,
        title: signal.title,
        region: input.region,
        categoryKeys: content.categories.map((c) => c.key),
      }).catch((err) => logger.warn({ err, signalId: signal.id }, "news-alert fan-out failed"));
    } catch (err) {
      logger.warn({ err, signalId: signal.id }, "signal analysis failed (skipped)");
    }
  }

  logger.info(
    { source: "analyze-signals", ...result, promptVersion: ANALYSIS_PROMPT_VERSION },
    "per-article analysis pass complete",
  );
  return result;
}
