import { prisma } from "./client";

export type Quadrant = "build" | "crowded" | "early" | "hype";

export interface QuadrantTrend {
  slug: string;
  title: string;
  /** Demand proxy (0–100) — the business/commercial-viability dimension. */
  demand: number;
  /** Supply proxy (0–100) — the competition dimension (inverted: high = saturated). */
  supply: number;
  opportunity: number | null;
  quadrant: Quadrant;
}

/** Threshold splitting high/low on each axis. */
export const QUADRANT_MIDPOINT = 50;

function classify(demand: number, supply: number): Quadrant {
  const highDemand = demand >= QUADRANT_MIDPOINT;
  const lowSupply = supply < QUADRANT_MIDPOINT;
  if (highDemand) return lowSupply ? "build" : "crowded";
  return lowSupply ? "early" : "hype";
}

/**
 * The Golden Quadrant: every scored trend plotted on demand (business) × supply (competition).
 * The "build" quadrant — high demand, low supply — is the one worth acting on. Uses the model's
 * scored dimensions today; the demand axis will later fold in mined "I wish there was…" signals.
 */
export async function listTrendsQuadrant(limit = 300): Promise<QuadrantTrend[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      slug: string;
      title: string;
      demand: number | null;
      supply: number | null;
      opportunity: number | null;
    }>
  >`
    SELECT t.slug, t.title,
           MAX(CASE WHEN s.dimension = 'BUSINESS' THEN s.value END) AS demand,
           MAX(CASE WHEN s.dimension = 'COMPETITION' THEN s.value END) AS supply,
           MAX(CASE WHEN s.dimension = 'OPPORTUNITY' THEN s.value END) AS opportunity
    FROM "Trend" t
    JOIN "Score" s ON s."trendId" = t.id
    GROUP BY t.id, t.slug, t.title
    HAVING MAX(CASE WHEN s.dimension = 'BUSINESS' THEN s.value END) IS NOT NULL
       AND MAX(CASE WHEN s.dimension = 'COMPETITION' THEN s.value END) IS NOT NULL
    ORDER BY opportunity DESC NULLS LAST
    LIMIT ${limit}`;

  return rows.map((r) => {
    const demand = Number(r.demand);
    const supply = Number(r.supply);
    return {
      slug: r.slug,
      title: r.title,
      demand,
      supply,
      opportunity: r.opportunity !== null ? Number(r.opportunity) : null,
      quadrant: classify(demand, supply),
    };
  });
}
