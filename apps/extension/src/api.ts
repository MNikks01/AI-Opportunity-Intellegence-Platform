/**
 * Pure logic for the extension popup (ADR-0007) — URL building, response mapping, and settings
 * normalization. No DOM/fetch here so it's unit-tested in the root vitest suite. The popup (popup.ts)
 * wires these to the DOM + `fetch` + `localStorage`.
 */

export const DEFAULT_BASE = "https://ai-opportunity-intellegence-platfor.vercel.app";

export interface Opportunity {
  slug: string;
  title: string;
  url: string;
  opportunity: number | null;
}

export interface Settings {
  base: string;
  apiKey: string;
}

/** Trim trailing slashes; fall back to the default when blank. */
export function normalizeBase(base: string | null | undefined): string {
  const b = (base ?? "").trim().replace(/\/+$/, "");
  return b || DEFAULT_BASE;
}

export function opportunitiesUrl(base: string, limit = 15): string {
  return `${normalizeBase(base)}/api/v1/opportunities?limit=${limit}`;
}

export function searchUrl(base: string, q: string, limit = 15): string {
  return `${normalizeBase(base)}/api/v1/search?q=${encodeURIComponent(q.trim())}&limit=${limit}`;
}

export function appUrl(base: string): string {
  return `${normalizeBase(base)}/quadrant`;
}

/** Authorization header for an optional API key; empty when none. */
export function authHeaders(apiKey: string | null | undefined): Record<string, string> {
  const k = (apiKey ?? "").trim();
  return k ? { authorization: `Bearer ${k}` } : {};
}

/** Map the public API's `{ data: [...] }` envelope to a safe Opportunity[] (guards every field). */
export function toOpportunities(json: unknown): Opportunity[] {
  const data = (json as { data?: unknown } | null)?.data;
  if (!Array.isArray(data)) return [];
  const out: Opportunity[] = [];
  for (const raw of data) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.slug !== "string" || typeof r.title !== "string") continue;
    out.push({
      slug: r.slug,
      title: r.title,
      url: typeof r.url === "string" ? r.url : `${DEFAULT_BASE}/trends/${r.slug}`,
      opportunity: typeof r.opportunity === "number" ? r.opportunity : null,
    });
  }
  return out;
}
