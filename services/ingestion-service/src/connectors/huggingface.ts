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
