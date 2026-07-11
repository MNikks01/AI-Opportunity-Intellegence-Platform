/**
 * Source: SEC EDGAR (Form D)
 * Classification: ✅ OFFICIAL — U.S. SEC public APIs (efts.sec.gov full-text search), unauthenticated,
 * public-domain U.S.-government data (no licensing). Fair-access policy: a declared User-Agent header is
 * required and requests are rate-limited (~10 req/s); this connector sends `SEC_USER_AGENT` and backs
 * off on 429/403. ToS/fair-access reviewed 2026-07-11: https://www.sec.gov/os/webmaster-faq#developers.
 * Auth: none. PII: issuer / related-person names are public filing data (kept only in `raw`).
 *
 * Form D = notice of an exempt (private) securities offering — i.e. a private funding round. A US AI
 * company raising capital is a leading DEMAND signal (money in precedes products + hiring). We query
 * EDGAR full-text search restricted to Form D + an AI phrase, so we ingest AI-relevant offerings, not
 * every Reg D filing. US-domiciled only (ADR-0006 D3). Malformed hits are skipped and counted.
 */
import { z } from "zod";
import type { SourceRecord } from "@aioi/shared";

export const SEC_EDGAR_SOURCE_KEY = "sec-edgar";
const FTS_URL = "https://efts.sec.gov/LATEST/search-index";

/** SEC's fair-access policy requires a contact User-Agent; without one we don't call the API. */
export function secEdgarConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.SEC_USER_AGENT && env.SEC_USER_AGENT.trim());
}

/** AI phrases to restrict Form D full-text search to relevant offerings. */
export const AI_QUERIES = ['"artificial intelligence"', '"machine learning"', '"generative ai"'];

export interface SecFetchDeps {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  maxRetries?: number;
  /** SEC requires a contact User-Agent (e.g. "AIOI research contact@example.com"). */
  userAgent?: string;
  /** AI phrases to search (defaults to AI_QUERIES). */
  queries?: string[];
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

type Resolved = Required<Omit<SecFetchDeps, "queries">> & { queries: string[] };

async function getJson(url: string, r: Resolved): Promise<unknown> {
  let attempt = 0;
  for (;;) {
    const res = await r.fetchImpl(url, {
      headers: { "user-agent": r.userAgent, accept: "application/json" },
    });
    // SEC returns 403 when the fair-access policy is tripped (missing/blocked UA); back off like 429.
    if (res.status === 429 || res.status === 403 || res.status >= 500) {
      if (attempt >= r.maxRetries)
        throw new Error(`SEC EDGAR fetch failed ${res.status} after ${attempt} retries`);
      const retryAfter = Number(res.headers.get("retry-after"));
      const backoff =
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 500;
      await r.sleep(backoff + Math.floor(Math.random() * 150));
      attempt += 1;
      continue;
    }
    if (!res.ok) throw new Error(`SEC EDGAR fetch failed ${res.status}`);
    return await res.json();
  }
}

// EDGAR full-text search response — we validate only the fields we use; the rest of `_source` is kept raw.
const hitSchema = z.object({
  _id: z.string().min(1),
  _source: z.object({
    form: z.string().optional(),
    file_date: z.string().optional(),
    display_names: z.array(z.string()).optional(),
    ciks: z.array(z.string()).optional(),
  }),
});
const ftsSchema = z.object({ hits: z.object({ hits: z.array(z.unknown()) }) });

/** Strip EDGAR's "Company Name (CIK 0001234567)" → "Company Name". */
export function cleanIssuer(displayName: string): string {
  return displayName.replace(/\s*\(CIK\s*\d+\)\s*$/i, "").trim();
}

/** Build the human-facing EDGAR filing URL from an accession id (`0001234567-25-000123:doc.xml`) + CIK. */
function filingUrl(id: string, cik?: string): string {
  const accession = id.split(":")[0] ?? id;
  if (cik) {
    const acc = accession.replace(/-/g, "");
    return `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${acc}/`;
  }
  return `https://efts.sec.gov/LATEST/search-index?q=&forms=D`;
}

/** Normalize one EDGAR hit to a SourceRecord, or null if it fails validation or isn't a Form D. */
export function normalize(hit: unknown): SourceRecord | null {
  const parsed = hitSchema.safeParse(hit);
  if (!parsed.success) return null;
  const { _id, _source } = parsed.data;
  if (_source.form && _source.form !== "D") return null;
  const issuer = _source.display_names?.[0] ? cleanIssuer(_source.display_names[0]) : undefined;
  if (!issuer) return null;
  const cik = _source.ciks?.[0];
  return {
    source: SEC_EDGAR_SOURCE_KEY,
    externalId: _id,
    url: filingUrl(_id, cik),
    title: `${issuer} — private funding (Form D)`,
    publishedAt: _source.file_date,
    text: `${issuer} filed an SEC Form D notice of a private securities offering (funding round).`,
    raw: _source,
  };
}

export interface SecIngestResult {
  records: SourceRecord[];
  skipped: number;
}

/**
 * Fetch recent AI-relevant Form D filings as normalized SourceRecords. One request per AI phrase;
 * results are de-duped by filing id. Requires a `userAgent` (SEC fair-access) — callers gate on env.
 */
export async function fetchFormDFilings(deps: SecFetchDeps = {}): Promise<SecIngestResult> {
  const r: Resolved = {
    fetchImpl: deps.fetchImpl ?? fetch,
    sleep: deps.sleep ?? defaultSleep,
    maxRetries: deps.maxRetries ?? 3,
    userAgent: deps.userAgent ?? "aioi-ingestion (contact: set SEC_USER_AGENT)",
    queries: deps.queries ?? AI_QUERIES,
  };
  const seen = new Set<string>();
  const records: SourceRecord[] = [];
  let skipped = 0;
  for (const q of r.queries) {
    const url = `${FTS_URL}?q=${encodeURIComponent(q)}&forms=D`;
    const json = await getJson(url, r);
    const top = ftsSchema.safeParse(json);
    if (!top.success) {
      skipped += 1;
      continue;
    }
    for (const hit of top.data.hits.hits) {
      const record = normalize(hit);
      if (!record) {
        skipped += 1;
        continue;
      }
      if (seen.has(record.externalId)) continue;
      seen.add(record.externalId);
      records.push(record);
    }
  }
  return { records, skipped };
}
