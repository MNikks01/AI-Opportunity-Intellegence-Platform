/**
 * Thin client for the AI Opportunity Intelligence public read API (apps/web /api/v1). The MCP server
 * calls the hosted platform over HTTP, so it distributes with no database credentials — set AIOI_API_URL
 * to your deployment (defaults to the public demo).
 */
const DEFAULT_BASE = "https://ai-opportunity-intellegence-platfor.vercel.app";

export interface TrendSummary {
  slug: string;
  title: string;
  url: string;
  opportunity: number | null;
  dimensions: Record<string, number>;
  topIdea: string | null;
}

export interface TrendDetail {
  slug: string;
  title: string;
  summary: string | null;
  status: string;
  url: string;
  scores: Record<string, number>;
  momentum: { state: string; delta: number; current: number } | null;
  entities: { id: string; name: string; type: string }[];
  plan: {
    topIdea: string | null;
    mvpScope: string | null;
    techStack: string[] | null;
    pricingHint: string | null;
    targetAudience: string | null;
  } | null;
}

export interface Opportunity {
  slug: string;
  title: string;
  url: string;
  opportunity: number | null;
  demand: number;
  supply: number;
  demandSignals: number;
}

export interface AioiClient {
  searchTrends(opts: { limit?: number; source?: string; sort?: string }): Promise<TrendSummary[]>;
  getTrend(slug: string): Promise<TrendDetail | null>;
  listOpportunities(opts: { limit?: number }): Promise<Opportunity[]>;
}

export function createClient(
  opts: { baseUrl?: string; fetchImpl?: typeof fetch } = {},
): AioiClient {
  const base = (opts.baseUrl || process.env.AIOI_API_URL || DEFAULT_BASE).replace(/\/$/, "");
  const fetchImpl = opts.fetchImpl ?? fetch;

  async function get<T>(path: string): Promise<{ data: T }> {
    const res = await fetchImpl(`${base}${path}`, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`AIOI API ${res.status} for ${path}`);
    return (await res.json()) as { data: T };
  }

  const qs = (params: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(params))
      if (v !== undefined && v !== "") u.set(k, String(v));
    const s = u.toString();
    return s ? `?${s}` : "";
  };

  return {
    async searchTrends({ limit, source, sort }) {
      return (await get<TrendSummary[]>(`/api/v1/trends${qs({ limit, source, sort })}`)).data;
    },
    async getTrend(slug) {
      const res = await fetchImpl(`${base}/api/v1/trends/${encodeURIComponent(slug)}`, {
        headers: { accept: "application/json" },
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`AIOI API ${res.status} for /api/v1/trends/${slug}`);
      return ((await res.json()) as { data: TrendDetail }).data;
    },
    async listOpportunities({ limit }) {
      return (await get<Opportunity[]>(`/api/v1/opportunities${qs({ limit })}`)).data;
    },
  };
}
