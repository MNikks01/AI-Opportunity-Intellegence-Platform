/**
 * Source: Crunchbase (funding rounds)
 * Classification: 🔶 LICENSED — Crunchbase Data API (api.crunchbase.com/api/v4), which requires a **paid
 * license + API key** and whose ToS permits use only under that license. This connector is INERT
 * without `CRUNCHBASE_API_KEY` (no calls, no cost); when a license is provisioned and the key is set it
 * activates automatically. Auth: `X-cb-user-key`. PII: issuer/org names are public company data.
 * Decision + options: docs/adr/ADR-0008-global-funding-source.md.
 *
 * Global private funding rounds are a leading DEMAND signal (money in precedes products) — the global
 * complement to the free, US-only SEC EDGAR Form D source (ADR-0006). We query recent AI-category
 * funding rounds and normalize each to a SourceRecord that flows through the existing pipeline.
 *
 * NOTE: the exact search field ids below follow Crunchbase's documented v4 schema; because this is
 * gated + MSW-mocked in CI, verify the live response shape on the first real run (malformed entities are
 * skipped and counted, never crash the run — and a failed query surfaces as a FAILED ingestion run).
 */
import { z } from "zod";
import type { SourceRecord } from "@aioi/shared";

export const CRUNCHBASE_SOURCE_KEY = "crunchbase";
const SEARCH_URL = "https://api.crunchbase.com/api/v4/searches/funding_rounds";

/** AI category slugs to restrict the funding-round search (Crunchbase category groups). */
export const AI_CATEGORIES = ["artificial-intelligence", "machine-learning", "generative-ai"];

/** Inert unless a paid Crunchbase key is configured — no calls, no cost. */
export function crunchbaseConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.CRUNCHBASE_API_KEY && env.CRUNCHBASE_API_KEY.trim());
}

export interface CrunchbaseFetchDeps {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  maxRetries?: number;
  apiKey?: string;
  /** Only rounds announced on/after this ISO date (default: ~90 days ago). */
  since?: string;
  limit?: number;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
type Resolved = Required<CrunchbaseFetchDeps>;

/** Format a USD amount as a compact string ($1.2B / $500M / $2.5M / $900K). */
export function formatUsd(v: number | null | undefined): string {
  if (!v || v <= 0) return "an undisclosed amount";
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${Math.round(v / 1e3)}K`;
  return `$${v}`;
}

async function postJson(url: string, body: unknown, r: Resolved): Promise<unknown> {
  let attempt = 0;
  for (;;) {
    const res = await r.fetchImpl(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "x-cb-user-key": r.apiKey,
      },
      body: JSON.stringify(body),
    });
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= r.maxRetries)
        throw new Error(`Crunchbase fetch failed ${res.status} after ${attempt} retries`);
      const retryAfter = Number(res.headers.get("retry-after"));
      const backoff =
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 500;
      await r.sleep(backoff + Math.floor(Math.random() * 150));
      attempt += 1;
      continue;
    }
    if (!res.ok) throw new Error(`Crunchbase fetch failed ${res.status}`);
    return await res.json();
  }
}

const entitySchema = z.object({
  uuid: z.string().min(1),
  properties: z.object({
    announced_on: z.object({ value: z.string() }).partial().optional(),
    investment_type: z.string().optional(),
    money_raised: z.object({ value_usd: z.number().nullable().optional() }).partial().optional(),
    funded_organization_identifier: z
      .object({ value: z.string().optional(), permalink: z.string().optional() })
      .optional(),
  }),
});
const searchSchema = z.object({ entities: z.array(z.unknown()) });

/** Normalize one Crunchbase funding-round entity to a SourceRecord, or null if malformed. */
export function normalize(entity: unknown): SourceRecord | null {
  const parsed = entitySchema.safeParse(entity);
  if (!parsed.success) return null;
  const { uuid, properties: p } = parsed.data;
  const org = p.funded_organization_identifier?.value;
  if (!org) return null;
  const amount = formatUsd(p.money_raised?.value_usd);
  const permalink = p.funded_organization_identifier?.permalink;
  return {
    source: CRUNCHBASE_SOURCE_KEY,
    externalId: uuid,
    url: permalink
      ? `https://www.crunchbase.com/organization/${permalink}`
      : "https://www.crunchbase.com",
    title: `${org} — raised ${amount} (Crunchbase)`,
    publishedAt: p.announced_on?.value,
    text: `${org} raised ${amount}${p.investment_type ? ` in a ${p.investment_type.replace(/_/g, " ")} round` : ""}.`,
    raw: parsed.data.properties,
  };
}

export interface CrunchbaseIngestResult {
  records: SourceRecord[];
  skipped: number;
}

/** Fetch recent AI-category funding rounds as normalized SourceRecords. Requires an API key. */
export async function fetchFundingRounds(
  deps: CrunchbaseFetchDeps = {},
): Promise<CrunchbaseIngestResult> {
  const r: Resolved = {
    fetchImpl: deps.fetchImpl ?? fetch,
    sleep: deps.sleep ?? defaultSleep,
    maxRetries: deps.maxRetries ?? 3,
    apiKey: deps.apiKey ?? process.env.CRUNCHBASE_API_KEY ?? "",
    since: deps.since ?? new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10),
    limit: deps.limit ?? 50,
  };
  const body = {
    field_ids: [
      "identifier",
      "announced_on",
      "investment_type",
      "money_raised",
      "funded_organization_identifier",
    ],
    order: [{ field_id: "announced_on", sort: "desc" }],
    query: [
      { type: "predicate", field_id: "announced_on", operator_id: "gte", values: [r.since] },
      {
        type: "predicate",
        field_id: "funded_organization_categories",
        operator_id: "includes",
        values: AI_CATEGORIES,
      },
    ],
    limit: r.limit,
  };
  const json = await postJson(SEARCH_URL, body, r);
  const top = searchSchema.safeParse(json);
  if (!top.success) return { records: [], skipped: 1 };
  const records: SourceRecord[] = [];
  let skipped = 0;
  for (const entity of top.data.entities) {
    const record = normalize(entity);
    if (record) records.push(record);
    else skipped += 1;
  }
  return { records, skipped };
}
