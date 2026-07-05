/**
 * Text embeddings for semantic search (B-019). Same swap pattern as the scoring provider: a
 * deterministic StubEmbedder for dev/test/offline, a LiteLLMEmbedder for production. Dimension is
 * fixed so it matches the Postgres `vector` column regardless of provider.
 */
export const EMBED_DIM = 1536;

export interface Embedder {
  readonly name: string;
  /** Embed a batch of texts → one unit-length vector each (length EMBED_DIM). */
  embed(texts: string[]): Promise<number[][]>;
}

/** Deterministic, offline pseudo-embedding: FNV-1a seed → LCG PRNG → unit vector. Not semantic. */
function hashEmbed(text: string, dim = EMBED_DIM): number[] {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const v = new Array<number>(dim);
  let state = h || 1;
  for (let i = 0; i < dim; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    v[i] = (state / 0x100000000) * 2 - 1;
  }
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

export class StubEmbedder implements Embedder {
  readonly name = "stub";
  embed(texts: string[]): Promise<number[][]> {
    return Promise.resolve(texts.map((t) => hashEmbed(t)));
  }
}

/** Production embedder via a LiteLLM gateway (OpenAI-compatible /embeddings). */
export class LiteLLMEmbedder implements Embedder {
  readonly name = "litellm";
  constructor(
    private readonly baseUrl: string,
    private readonly model = process.env.AIOI_EMBED_MODEL ?? "text-embedding-3-small",
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async embed(texts: string[]): Promise<number[][]> {
    const res = await this.fetchImpl(`${this.baseUrl}/embeddings`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: this.model, input: texts }),
    });
    if (!res.ok) throw new Error(`LiteLLM embeddings error ${res.status}`);
    const data = (await res.json()) as { data?: Array<{ embedding: number[] }> };
    return (data.data ?? []).map((d) => d.embedding);
  }
}

/** LiteLLM when a gateway + key are configured, else the deterministic stub. */
export function getEmbedder(env: NodeJS.ProcessEnv = process.env): Embedder {
  const base = env.LITELLM_BASE_URL;
  const hasKey = Boolean(env.OPENAI_API_KEY ?? env.ANTHROPIC_API_KEY ?? env.GEMINI_API_KEY);
  if (base && hasKey) return new LiteLLMEmbedder(base);
  return new StubEmbedder();
}
