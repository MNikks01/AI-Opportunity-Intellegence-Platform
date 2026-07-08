/**
 * @aioi/ai-sdk
 * The only path to LLMs. Provides a provider-agnostic interface (LiteLLM in prod) plus a
 * deterministic StubProvider used when no gateway/key is configured — so scoring runs, is testable,
 * and stays reproducible offline. Real calls should be traced (Langfuse) and cost-capped.
 */
import {
  rawModelScoreSchema,
  actionPlanContentSchema,
  extractedEntitiesSchema,
  type RawModelScore,
  type ActionPlanContent,
  type ExtractedEntity,
} from "@aioi/validation";
import type { ScoreDimension } from "@aioi/shared";

export interface ScoreRequest {
  dimension: ScoreDimension;
  trendTitle: string;
  /** Aggregated signal text the score must be grounded in. */
  context: string;
  /** Stable ids the model may cite as evidence (must be non-empty). */
  evidenceIds: string[];
  /** The 0/50/100 anchor text for this dimension from the rubric. */
  rubricAnchor: string;
}

export interface ActionPlanRequest {
  trendTitle: string;
  trendSummary?: string;
  /** dimension → 0..100 score, to bias the plan (e.g. high monetization → more SaaS ideas). */
  scores: Record<string, number>;
  evidenceIds: string[];
}

export interface LLMProvider {
  readonly name: string;
  scoreDimension(req: ScoreRequest): Promise<RawModelScore>;
  generateActionPlan(req: ActionPlanRequest): Promise<ActionPlanContent>;
  /** Open-ended entity discovery from text (companies/models/tools/people). Stub returns none. */
  extractEntities(text: string): Promise<ExtractedEntity[]>;
}

/** FNV-1a — small, deterministic, dependency-free hash for the stub. */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Deterministic offline provider. Produces schema-valid, stable scores from a hash of the input.
 * NOT a real model — it exists so the pipeline and tests run without keys. Real quality comes from
 * LiteLLMProvider + the eval harness.
 */
export class StubProvider implements LLMProvider {
  readonly name = "stub";

  scoreDimension(req: ScoreRequest): Promise<RawModelScore> {
    if (req.evidenceIds.length === 0) {
      return Promise.reject(new Error("scoreDimension requires at least one evidence id"));
    }
    const seed = hash(`${req.dimension}::${req.trendTitle}::${req.context}`);
    const value = seed % 101; // 0..100
    const confidence = Number((0.45 + (seed % 40) / 100).toFixed(2)); // 0.45..0.84
    const result: RawModelScore = {
      value,
      confidence,
      rationale: `Deterministic stub estimate for ${req.dimension} based on ${req.evidenceIds.length} signal(s).`,
      evidence: req.evidenceIds.slice(0, 3),
    };
    return Promise.resolve(rawModelScoreSchema.parse(result));
  }

  generateActionPlan(req: ActionPlanRequest): Promise<ActionPlanContent> {
    const t = req.trendTitle;
    const slug =
      t
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 24) || "trend";
    const bare = slug.replace(/-/g, "");
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const seed = hash(t);
    const content: ActionPlanContent = {
      saasIdeas: [`A managed ${t} platform`, `${t} analytics & monitoring dashboard`],
      apiIdeas: [`A ${t} data API with usage-based pricing`],
      contentIdeas: [`How ${t} is reshaping developer workflows`, `Top ${t} tools compared`],
      keywords: [slug, `${slug}-tools`, `best-${slug}`],
      domainNames: [`${slug}.dev`, `get${bare}.com`, `${bare}hq.io`],
      productNames: [`${cap(bare)}ly`, `${cap(bare)}HQ`, `Open${cap(bare)}`],
      targetAudience: `Developers and startups building with ${t}`,
      pricingHint: `Freemium with a $${19 + (seed % 30)}/mo Pro tier`,
      mvpScope: `A focused MVP: ingest ${t} signals, one core workflow, and a shareable dashboard.`,
      techStack: ["Next.js", "tRPC", "PostgreSQL", "Redis"],
    };
    return Promise.resolve(actionPlanContentSchema.parse(content));
  }

  // Offline: entity discovery is left to the deterministic dictionary in @aioi/ai-service.
  extractEntities(_text: string): Promise<ExtractedEntity[]> {
    return Promise.resolve([]);
  }
}

/**
 * Production provider: talks to a LiteLLM gateway (OpenAI-compatible) so any of
 * OpenAI/Anthropic/Gemini/OpenRouter can serve the request via one interface.
 */
export class LiteLLMProvider implements LLMProvider {
  readonly name = "litellm";
  constructor(
    private readonly baseUrl: string,
    private readonly model = process.env.AIOI_SCORING_MODEL ?? "claude-opus-4-8",
    private readonly fetchImpl: typeof fetch = fetch,
    // Optional bearer token — set when hitting a provider directly (e.g. https://api.openai.com/v1);
    // leave unset for a LiteLLM proxy that injects the key itself.
    private readonly apiKey?: string,
  ) {}

  private headers(): Record<string, string> {
    return {
      "content-type": "application/json",
      ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
    };
  }

  async scoreDimension(req: ScoreRequest): Promise<RawModelScore> {
    const system =
      "You are a rigorous market analyst. Score ONE dimension for an AI trend on a 0-100 scale " +
      "using the provided rubric anchors. Cite evidence ONLY from the provided ids. " +
      'Return strict JSON: {"value":int,"confidence":number,"rationale":string,"evidence":string[]}.';
    const user =
      `Dimension: ${req.dimension}\nRubric anchors: ${req.rubricAnchor}\n` +
      `Trend: ${req.trendTitle}\nEvidence ids: ${req.evidenceIds.join(", ")}\n\nContext:\n${req.context}`;

    const res = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: this.model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) throw new Error(`LiteLLM error ${res.status}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content ?? "";
    // Strict validation; one repair pass could be added here before throwing.
    return rawModelScoreSchema.parse(JSON.parse(content));
  }

  async generateActionPlan(req: ActionPlanRequest): Promise<ActionPlanContent> {
    const system =
      "You are a pragmatic startup advisor. Given an AI trend and its opportunity scores, propose a " +
      "concrete, buildable action plan. Return STRICT JSON matching this shape: " +
      '{"saasIdeas":string[],"apiIdeas":string[],"contentIdeas":string[],"keywords":string[],' +
      '"domainNames":string[],"productNames":string[],"targetAudience":string,"pricingHint":string,' +
      '"mvpScope":string,"techStack":string[]}. saasIdeas must be non-empty.';
    const user =
      `Trend: ${req.trendTitle}\n${req.trendSummary ? `Summary: ${req.trendSummary}\n` : ""}` +
      `Scores: ${JSON.stringify(req.scores)}\nEvidence ids: ${req.evidenceIds.join(", ")}`;

    const res = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: this.model,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) throw new Error(`LiteLLM error ${res.status}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content ?? "";
    return actionPlanContentSchema.parse(JSON.parse(content));
  }

  async extractEntities(text: string): Promise<ExtractedEntity[]> {
    const system =
      "Extract only real, specific named entities relevant to AI from the text — companies/labs, " +
      "models, tools/frameworks, protocols (MCP_SERVER), notable people (PERSON), or repos (REPO). " +
      "No generic terms. Return STRICT JSON: " +
      '{"entities":[{"name":string,"type":"COMPANY"|"MODEL"|"REPO"|"TOOL"|"MCP_SERVER"|"PAPER"|"PERSON"}]}. ' +
      "Max 8 entities.";
    const res = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: this.model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: text.slice(0, 4000) },
        ],
      }),
    });
    if (!res.ok) throw new Error(`LiteLLM error ${res.status}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content ?? "{}";
    return extractedEntitiesSchema.parse(JSON.parse(content)).entities;
  }
}

/**
 * Default chat model that matches the configured provider key, so one key "just works" (AIOI_SCORING_MODEL
 * always wins). Anthropic → claude-opus-4-8, OpenAI → gpt-4o-mini — both routed by the LiteLLM config.
 */
export function defaultChatModel(env: NodeJS.ProcessEnv = process.env): string {
  if (env.AIOI_SCORING_MODEL) return env.AIOI_SCORING_MODEL;
  if (env.ANTHROPIC_API_KEY) return "claude-opus-4-8";
  if (env.OPENAI_API_KEY) return "gpt-4o-mini";
  if (env.AIOI_LLM_API_KEY) return "gpt-4o-mini"; // direct OpenAI-compatible endpoint (no gateway)
  return "claude-opus-4-8";
}

/**
 * LiteLLM when a gateway/provider is configured, else the deterministic stub. `AIOI_LLM_API_KEY` (an
 * optional bearer token) lets `LITELLM_BASE_URL` point straight at a provider — e.g.
 * `LITELLM_BASE_URL=https://api.openai.com/v1` + `AIOI_LLM_API_KEY=sk-…` — so real scoring works in
 * serverless/CI without hosting a gateway.
 */
export function getProvider(env: NodeJS.ProcessEnv = process.env): LLMProvider {
  const base = env.LITELLM_BASE_URL;
  const hasKey = Boolean(
    env.OPENAI_API_KEY ?? env.ANTHROPIC_API_KEY ?? env.GEMINI_API_KEY ?? env.AIOI_LLM_API_KEY,
  );
  if (base && hasKey)
    return new LiteLLMProvider(base, defaultChatModel(env), fetch, env.AIOI_LLM_API_KEY);
  return new StubProvider();
}

export { EMBED_DIM, StubEmbedder, LiteLLMEmbedder, getEmbedder, type Embedder } from "./embed";
