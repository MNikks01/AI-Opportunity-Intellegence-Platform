/**
 * Source: Hugging Face
 * Classification: ✅ OFFICIAL — Hugging Face Hub API (public models listing). ToS: HF Terms + API docs
 * (reviewed 2026-07-06). Reads only public model metadata; no gated/private repos, no dataset content.
 * Works unauthenticated; HUGGINGFACE_TOKEN raises the rate limit. PII: authors are public org/user
 * handles, kept only inside `raw`.
 *
 * Strategy: surface the most-liked models (high community traction) as an AI-momentum signal.
 */
import { z } from "zod";
import type { SourceRecord } from "@aioi/shared";

export const HUGGINGFACE_SOURCE_KEY = "huggingface";
const MODELS_URL = "https://huggingface.co/api/models";

/** Sort field for the models listing; override with HF_SORT (likes | downloads | createdAt). */
export const DEFAULT_HF_SORT = "likes";

function userAgent(env: NodeJS.ProcessEnv): string {
  return env.HF_USER_AGENT ?? "aioi-ingestion/1.0";
}

const modelSchema = z.object({
  id: z.string(),
  likes: z.number().optional(),
  downloads: z.number().optional(),
  pipeline_tag: z.string().optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.string().optional(),
  library_name: z.string().optional(),
});
export type HfModel = z.infer<typeof modelSchema>;

export interface FetchDeps {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  maxRetries?: number;
  env?: NodeJS.ProcessEnv;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

type Resolved = Required<Omit<FetchDeps, "env">> & { env: NodeJS.ProcessEnv };
function resolve(deps: FetchDeps): Resolved {
  return {
    fetchImpl: deps.fetchImpl ?? fetch,
    sleep: deps.sleep ?? defaultSleep,
    maxRetries: deps.maxRetries ?? 3,
    env: deps.env ?? process.env,
  };
}

function headers(env: NodeJS.ProcessEnv): Record<string, string> {
  const h: Record<string, string> = { accept: "application/json", "user-agent": userAgent(env) };
  if (env.HUGGINGFACE_TOKEN) h.authorization = `Bearer ${env.HUGGINGFACE_TOKEN}`;
  return h;
}

async function request(url: string, r: Resolved): Promise<Response> {
  let attempt = 0;
  for (;;) {
    const res = await r.fetchImpl(url, { headers: headers(r.env) });
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= r.maxRetries)
        throw new Error(`huggingface fetch failed ${res.status} after ${attempt} retries`);
      const retryAfter = Number(res.headers.get("retry-after"));
      const backoff =
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 500;
      await r.sleep(backoff + Math.floor(Math.random() * 100));
      attempt += 1;
      continue;
    }
    return res;
  }
}

/** Normalize a validated model to a SourceRecord. */
export function normalize(model: HfModel): SourceRecord | null {
  if (!model.id) return null;
  const text = [model.id, model.pipeline_tag ?? "", (model.tags ?? []).join(" ")]
    .filter(Boolean)
    .join(" ")
    .trim();
  return {
    source: HUGGINGFACE_SOURCE_KEY,
    externalId: model.id,
    url: `https://huggingface.co/${model.id}`,
    title: model.id,
    publishedAt: model.createdAt,
    text,
    raw: model,
  };
}

export interface IngestResult {
  records: SourceRecord[];
  skipped: number;
}

// ── Model-card enrichment (M9) ───────────────────────────────────────────────
const MODEL_DETAIL_URL = "https://huggingface.co/api/models";

/** The HF model-detail fields we read (all optional; the endpoint returns much more). */
const modelDetailSchema = z.object({
  id: z.string().optional(),
  library_name: z.string().optional(),
  tags: z.array(z.string()).optional(),
  cardData: z.object({ license: z.string().optional() }).partial().passthrough().optional(),
  safetensors: z.object({ total: z.number().optional() }).partial().passthrough().optional(),
  siblings: z.array(z.object({ rfilename: z.string().optional() }).passthrough()).optional(),
});
export type HfModelDetail = z.infer<typeof modelDetailSchema>;

export interface ModelCardFields {
  license: string | null;
  paramsB: number | null;
  ggufAvailable: boolean;
  mlxAvailable: boolean;
  vllmSupported: boolean;
  transformers: boolean;
  weightsUrl: string | null;
  benchmarks: Record<string, number> | null;
}

/** Derive ModelCard fields from an HF model-detail payload. Pure. */
export function parseModelCard(detail: HfModelDetail): ModelCardFields {
  const tags = (detail.tags ?? []).map((t) => t.toLowerCase());
  const has = (t: string) => tags.includes(t);
  const licenseTag = tags.find((t) => t.startsWith("license:"))?.slice("license:".length);
  const siblings = detail.siblings ?? [];
  const gguf = has("gguf") || siblings.some((s) => s.rfilename?.toLowerCase().endsWith(".gguf"));
  const total = detail.safetensors?.total;
  const paramsB = typeof total === "number" && total > 0 ? Number((total / 1e9).toFixed(1)) : null;

  return {
    license: detail.cardData?.license ?? licenseTag ?? null,
    paramsB,
    ggufAvailable: gguf,
    mlxAvailable: has("mlx") || detail.library_name === "mlx",
    vllmSupported: has("vllm"),
    transformers: detail.library_name === "transformers" || has("transformers"),
    weightsUrl: detail.id ? `https://huggingface.co/${detail.id}` : null,
    benchmarks: null, // HF detail carries no standardized benchmark set; populated elsewhere if ever.
  };
}

/**
 * Fetch + parse one model's card detail by HF repo id (e.g. "meta-llama/Llama-3-8B"). Returns null if
 * the model isn't on HF (404) or the response is unusable — enrichment is best-effort per model.
 */
export async function fetchModelDetail(
  id: string,
  deps: FetchDeps = {},
): Promise<ModelCardFields | null> {
  const r = resolve(deps);
  const url = `${MODEL_DETAIL_URL}/${id.split("/").map(encodeURIComponent).join("/")}`;
  let res: Response;
  try {
    res = await request(url, r);
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const parsed = modelDetailSchema.safeParse(await res.json().catch(() => null));
  if (!parsed.success) return null;
  return parseModelCard({ ...parsed.data, id: parsed.data.id ?? id });
}

/** Fetch the top models (by HF_SORT, desc) as normalized SourceRecords. */
export async function fetchModels(
  limit = 30,
  deps: FetchDeps = {},
  opts: { sort?: string } = {},
): Promise<IngestResult> {
  const r = resolve(deps);
  const sort = opts.sort ?? r.env.HF_SORT ?? DEFAULT_HF_SORT;
  const url = `${MODELS_URL}?sort=${encodeURIComponent(sort)}&direction=-1&limit=${limit}`;

  const res = await request(url, r);
  if (!res.ok) throw new Error(`huggingface fetch failed ${res.status}`);
  const parsed = z.array(z.unknown()).safeParse(await res.json());
  if (!parsed.success) return { records: [], skipped: 0 };

  const records: SourceRecord[] = [];
  let skipped = 0;
  for (const item of parsed.data) {
    const model = modelSchema.safeParse(item);
    if (!model.success) {
      skipped += 1;
      continue;
    }
    const record = normalize(model.data);
    if (record) records.push(record);
    else skipped += 1;
  }
  return { records, skipped };
}
