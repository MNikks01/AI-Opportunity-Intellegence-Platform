/**
 * Signal → Trend clustering (B-006). Embeds signal text (@aioi/ai-sdk) and greedily groups by cosine
 * similarity to a running centroid — a simple, deterministic "embed + heuristic" that swaps to real
 * semantic clustering when a real embedder is configured. Clusters of >= minSize become Trends.
 */
import { getEmbedder, type Embedder } from "@aioi/ai-sdk";
import { createTrendFromSignalIds, listUnclusteredSignals } from "@aioi/database";

export interface SignalInput {
  id: string;
  text: string;
}

export interface Cluster {
  signalIds: string[];
  label: string;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i]! * b[i]!;
  return dot; // embeddings are unit-length, so dot product == cosine similarity
}

/**
 * Cosine threshold for merging a signal into a cluster. The default (0.5) suits real embeddings —
 * measured cosine between differently-worded posts about the same topic is ~0.55, while unrelated
 * topics sit ~0.2, so 0.5 separates them cleanly. (The Stub embedder gives ~1.0 for identical text and
 * ~0 otherwise, so it clusters correctly at this threshold too.) Override with CLUSTER_THRESHOLD.
 */
export function clusterThreshold(): number {
  const n = process.env.CLUSTER_THRESHOLD ? Number(process.env.CLUSTER_THRESHOLD) : NaN;
  return Number.isFinite(n) ? n : 0.5;
}

export async function clusterSignals(
  signals: SignalInput[],
  opts: { threshold?: number; embedder?: Embedder } = {},
): Promise<Cluster[]> {
  if (signals.length === 0) return [];
  const threshold = opts.threshold ?? clusterThreshold();
  const embedder = opts.embedder ?? getEmbedder();
  const vectors = await embedder.embed(signals.map((s) => s.text));

  const groups: Array<{ centroid: number[]; members: number[] }> = [];
  signals.forEach((_, i) => {
    const v = vectors[i]!;
    let best = -1;
    let bestSim = threshold;
    groups.forEach((g, gi) => {
      const sim = cosine(v, g.centroid);
      if (sim >= bestSim) {
        bestSim = sim;
        best = gi;
      }
    });
    if (best >= 0) {
      const g = groups[best]!;
      // running mean centroid
      g.centroid = g.centroid.map(
        (c, k) => (c * g.members.length + v[k]!) / (g.members.length + 1),
      );
      g.members.push(i);
    } else {
      groups.push({ centroid: [...v], members: [i] });
    }
  });

  return groups.map((g) => ({
    signalIds: g.members.map((i) => signals[i]!.id),
    label: signals[g.members[0]!]!.text.slice(0, 80),
  }));
}

/**
 * Cluster the backlog of unclustered signals and persist each qualifying cluster as a Trend.
 * A system job (scheduler) calls this. Returns how many trends were created.
 */
export async function clusterRecentSignals(
  opts: { limit?: number; minSize?: number; threshold?: number } = {},
): Promise<{ signals: number; trends: number }> {
  const rows = await listUnclusteredSignals(opts.limit ?? 500);
  const signals: SignalInput[] = rows.map((r) => ({ id: r.id, text: r.title ?? r.id }));
  const clusters = await clusterSignals(signals, { threshold: opts.threshold });

  const minSize = opts.minSize ?? 1;
  let trends = 0;
  for (const c of clusters) {
    if (c.signalIds.length < minSize) continue;
    await createTrendFromSignalIds(c.signalIds, c.label);
    trends += 1;
  }
  return { signals: signals.length, trends };
}
