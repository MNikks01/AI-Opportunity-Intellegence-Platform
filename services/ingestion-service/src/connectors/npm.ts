/**
 * Source: npm
 * Classification: ✅ OFFICIAL — public npm registry search API (registry.npmjs.org), unauthenticated.
 * ToS reviewed 2026-07-09 (npm Terms; registry data is public). Auth: none. PII: publisher handles are
 * public, kept only in `raw`.
 *
 * Strategy: surface AI packages ranked by popularity — package adoption is a leading indicator (a new
 * SDK/agent framework trends on npm before most products ship on it). Malformed items are skipped.
 */
import { z } from "zod";
import type { SourceRecord } from "@aioi/shared";

export const NPM_SOURCE_KEY = "npm";
const SEARCH_URL = "https://registry.npmjs.org/-/v1/search";
/** Free-text AI query; results are popularity-ranked at fetch time. */
export const DEFAULT_NPM_QUERY = "llm ai agent sdk";

export interface NpmFetchDeps {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  maxRetries?: number;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function getJson<T>(url: string, deps: Required<NpmFetchDeps>): Promise<T> {
  let attempt = 0;
  for (;;) {
    const res = await deps.fetchImpl(url, { headers: { accept: "application/json" } });
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= deps.maxRetries)
        throw new Error(`npm fetch failed ${res.status} after ${attempt} retries`);
      const retryAfter = Number(res.headers.get("retry-after"));
      const backoff =
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 300;
      await deps.sleep(backoff + Math.floor(Math.random() * 150));
      attempt += 1;
      continue;
    }
    if (!res.ok) throw new Error(`npm fetch failed ${res.status}`);
    return (await res.json()) as T;
  }
}

const npmPackageSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  version: z.string().optional(),
  date: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  links: z
    .object({
      npm: z.string().optional(),
      homepage: z.string().optional(),
      repository: z.string().optional(),
    })
    .optional(),
});
const objectSchema = z.object({
  package: npmPackageSchema,
  score: z.object({ final: z.number().optional() }).optional(),
});
export type NpmObject = z.infer<typeof objectSchema>;

const searchSchema = z.object({ objects: z.array(z.unknown()) });

/** Normalize a validated npm search object to a SourceRecord. */
export function normalize(obj: NpmObject): SourceRecord | null {
  const pkg = obj.package;
  if (!pkg.name) return null;
  return {
    source: NPM_SOURCE_KEY,
    externalId: pkg.name,
    url: pkg.links?.npm ?? `https://www.npmjs.com/package/${pkg.name}`,
    title: pkg.name,
    publishedAt: pkg.date,
    text: [pkg.name, pkg.description].filter(Boolean).join(" ").trim(),
    raw: obj,
  };
}

export interface NpmIngestResult {
  records: SourceRecord[];
  skipped: number;
}

/** Fetch the top `limit` AI packages by popularity as normalized SourceRecords. */
export async function fetchPackages(limit = 30, deps: NpmFetchDeps = {}): Promise<NpmIngestResult> {
  const resolved = {
    fetchImpl: deps.fetchImpl ?? fetch,
    sleep: deps.sleep ?? defaultSleep,
    maxRetries: deps.maxRetries ?? 3,
  };
  const url = `${SEARCH_URL}?text=${encodeURIComponent(DEFAULT_NPM_QUERY)}&size=${limit}&popularity=1.0`;
  const raw = await getJson<unknown>(url, resolved);
  const parsed = searchSchema.safeParse(raw);
  if (!parsed.success) throw new Error("npm search: unexpected response shape");

  const records: SourceRecord[] = [];
  let skipped = 0;
  for (const item of parsed.data.objects) {
    const obj = objectSchema.safeParse(item);
    if (!obj.success) {
      skipped += 1;
      continue;
    }
    const record = normalize(obj.data);
    if (record) records.push(record);
    else skipped += 1;
  }
  return { records, skipped };
}
