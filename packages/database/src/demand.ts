import { prisma } from "./client";

/**
 * Demand mining: phrases that express someone *wanting* a tool/solution, as opposed to someone
 * shipping one. These lift a trend on the Golden Quadrant's demand axis — the beginning of measuring
 * articulated demand against observed supply. High-precision on purpose; extend over time.
 */
const DEMAND_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\bask hn\b/i, label: "Ask HN" },
  { re: /\bi wish (there|i)\s+(was|were|had|could)\b/i, label: "I wish there was" },
  {
    re: /\bis there (a|an|any)\b[^.?!]{0,40}\b(tool|app|service|way|software|library|api|platform|plugin)\b/i,
    label: "is there a tool",
  },
  { re: /\blooking for (a|an|some)\b/i, label: "looking for" },
  { re: /\bdoes anyone (know|have|use)\b/i, label: "does anyone know" },
  { re: /\balternative(s)? to\b/i, label: "alternative to" },
  { re: /\b(recommend|recommendations?)\b/i, label: "recommendations" },
  {
    re: /\bneed (a|an|some)\b[^.?!]{0,30}\b(tool|way|app|service|library|solution|plugin)\b/i,
    label: "need a tool",
  },
  { re: /\bhelp me (find|build|choose)\b/i, label: "help me find" },
  { re: /\bhow (do|can) (i|you|we)\b[^.?!]{0,40}\b(without|instead of)\b/i, label: "how do I" },
];

/** The first demand phrase expressed in the text, or null. */
export function mineDemand(text: string): string | null {
  for (const p of DEMAND_PATTERNS) if (p.re.test(text)) return p.label;
  return null;
}

/** Count of each trend's signals that express demand (by signal title). Keyed by trendId. */
export async function getTrendDemandHits(trendIds: string[]): Promise<Map<string, number>> {
  if (trendIds.length === 0) return new Map();
  const rows = await prisma.trendSignal.findMany({
    where: { trendId: { in: trendIds } },
    select: { trendId: true, signal: { select: { title: true } } },
  });
  const hits = new Map<string, number>();
  for (const r of rows) {
    if (r.signal.title && mineDemand(r.signal.title)) {
      hits.set(r.trendId, (hits.get(r.trendId) ?? 0) + 1);
    }
  }
  return hits;
}
