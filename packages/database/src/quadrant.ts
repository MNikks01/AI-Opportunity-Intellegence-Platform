import { prisma } from "./client";
import { getTrendDemandHits } from "./demand";
import { getTrendFundingHits } from "./funding";

export type Quadrant = "build" | "crowded" | "early" | "hype";

export interface QuadrantTrend {
  slug: string;
  title: string;
  /** Blended demand (0–100): business viability lifted by mined "I wish there was…" signals. */
  demand: number;
  /** Base demand before the mined-signal lift (the business dimension). */
  businessDemand: number;
  /** How many of the trend's signals expressed demand. */
  demandSignals: number;
  /** How many of the trend's signals are funding rounds (SEC EDGAR Form D). */
  fundingSignals: number;
  /** Supply proxy (0–100) — the competition dimension (inverted: high = saturated). */
  supply: number;
  opportunity: number | null;
  quadrant: Quadrant;
}

/** Threshold splitting high/low on each axis. */
export const QUADRANT_MIDPOINT = 50;
/** Per demand-signal lift to the demand axis, capped, so articulated demand moves a trend up. */
const DEMAND_LIFT_PER_SIGNAL = 12;
const DEMAND_LIFT_CAP = 30;
/** Funding is committed capital — a stronger demand signal than an ask; lifts more, own cap. */
const FUNDING_LIFT_PER_SIGNAL = 15;
const FUNDING_LIFT_CAP = 30;

function classify(demand: number, supply: number): Quadrant {
  const highDemand = demand >= QUADRANT_MIDPOINT;
  const lowSupply = supply < QUADRANT_MIDPOINT;
  if (highDemand) return lowSupply ? "build" : "crowded";
  return lowSupply ? "early" : "hype";
}

/**
 * The Golden Quadrant: every scored trend plotted on demand × supply (competition). Demand blends the
 * model's business score with mined demand — signals where people *ask* for a tool ("Ask HN", "is there
 * a tool…") lift a trend up the demand axis, the first step toward measuring articulated demand against
 * observed supply. The "build" quadrant (high demand, low supply) is the one worth acting on.
 */
export async function listTrendsQuadrant(limit = 300): Promise<QuadrantTrend[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      slug: string;
      title: string;
      demand: number | null;
      supply: number | null;
      opportunity: number | null;
    }>
  >`
    SELECT t.id, t.slug, t.title,
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

  const ids = rows.map((r) => r.id);
  const demandHits = await getTrendDemandHits(ids);
  const fundingHits = await getTrendFundingHits(ids);

  return rows.map((r) => {
    const businessDemand = Number(r.demand);
    const supply = Number(r.supply);
    const demandSignals = demandHits.get(r.id) ?? 0;
    const fundingSignals = fundingHits.get(r.id) ?? 0;
    const demandLift = Math.min(DEMAND_LIFT_CAP, demandSignals * DEMAND_LIFT_PER_SIGNAL);
    const fundingLift = Math.min(FUNDING_LIFT_CAP, fundingSignals * FUNDING_LIFT_PER_SIGNAL);
    const demand = Math.min(100, businessDemand + demandLift + fundingLift);
    return {
      slug: r.slug,
      title: r.title,
      demand,
      businessDemand,
      demandSignals,
      fundingSignals,
      supply,
      opportunity: r.opportunity !== null ? Number(r.opportunity) : null,
      quadrant: classify(demand, supply),
    };
  });
}
