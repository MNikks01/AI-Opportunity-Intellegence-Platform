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

/** Scale a vector to unit length (the cosine paths — clustering, pgvector `<=>` — assume this). */
function unitNormalize(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class StubEmbedder implements Embedder {
  readonly name = "stub";
  embed(texts: string[]): Promise<number[][]> {
    return Promise.resolve(texts.map((t) => hashEmbed(t)));
  }
}

/**
 * Production embedder via a LiteLLM gateway (OpenAI-compatible `/embeddings`). Requests `dimensions:
 * EMBED_DIM` so output always matches the pgvector column regardless of model; unit-normalizes each
 * vector; preserves input order; retries transient 429/5xx; and fails loudly on a dimension/count
 * mismatch rather than corrupting the index.
 */
export class LiteLLMEmbedder implements Embedder {
  readonly name = "litellm";
  constructor(
    private readonly baseUrl: string,
    private readonly model = process.env.AIOI_EMBED_MODEL ?? "text-embedding-3-small",
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly sleep: (ms: number) => Promise<void> = defaultSleep,
    private readonly maxRetries = 3,
    // Optional bearer token — set when hitting a provider directly (e.g. https://api.openai.com/v1);
    // leave unset for a LiteLLM proxy that injects the key itself.
    private readonly apiKey?: string,
  ) {}

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (this.apiKey) headers.authorization = `Bearer ${this.apiKey}`;
    let attempt = 0;
    for (;;) {
      const res = await this.fetchImpl(`${this.baseUrl}/embeddings`, {
        method: "POST",
        headers,
        body: JSON.stringify({ model: this.model, input: texts, dimensions: EMBED_DIM }),
      });
      if (res.status === 429 || res.status >= 500) {
        if (attempt >= this.maxRetries)
          throw new Error(`LiteLLM embeddings error ${res.status} after ${attempt} retries`);
        await this.sleep(2 ** attempt * 200 + Math.floor(Math.random() * 100));
        attempt += 1;
        continue;
      }
      if (!res.ok) throw new Error(`LiteLLM embeddings error ${res.status}`);
      const data = (await res.json()) as {
        data?: Array<{ embedding: number[]; index?: number }>;
      };
      const rows = data.data ?? [];
      if (rows.length !== texts.length)
        throw new Error(`LiteLLM embeddings: expected ${texts.length} vectors, got ${rows.length}`);
      return rows
        .slice()
        .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
        .map((d) => {
          if (d.embedding.length !== EMBED_DIM)
            throw new Error(`LiteLLM embeddings: dim ${d.embedding.length} != ${EMBED_DIM}`);
          return unitNormalize(d.embedding);
        });
    }
  }
}

/** LiteLLM when a gateway + key are configured, else the deterministic stub. */
export function getEmbedder(env: NodeJS.ProcessEnv = process.env): Embedder {
  const base = env.LITELLM_BASE_URL;
  // AIOI_LLM_API_KEY lets base point straight at a provider (e.g. https://api.openai.com/v1) with no
  // gateway — so real embeddings work in serverless/CI. OpenAI is needed for embeddings specifically.
  const hasKey = Boolean(env.OPENAI_API_KEY ?? env.AIOI_LLM_API_KEY);
  if (base && hasKey) {
    return new LiteLLMEmbedder(
      base,
      env.AIOI_EMBED_MODEL ?? "text-embedding-3-small",
      fetch,
      undefined,
      undefined,
      env.AIOI_LLM_API_KEY,
    );
  }
  return new StubEmbedder();
}
