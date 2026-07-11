/**
 * Supply-side entity sync (M15-A / ADR-0005 D2). Deterministically upserts `MODEL` / `REPO` /
 * `MCP_SERVER` entities directly from the structured Hugging Face + GitHub signals we already ingest
 * (an OFFICIAL classification each — no new source), and links them to the trends those signals belong
 * to. Complements text-based `extractEntities`: the model id / repo full-name is authoritative, so the
 * supply side doesn't depend on the LLM spotting it in prose. Pure/deterministic — no model calls.
 */
import type { $Enums } from "@prisma/client";
import { prisma } from "./client";
import { upsertEntity, linkTrendEntity } from "./entities";

const HUGGINGFACE_KEY = "huggingface";
const GITHUB_KEY = "github";

const MCP_TOPICS = new Set(["mcp", "mcp-server", "model-context-protocol"]);

/**
 * Classify a GitHub repo as an MCP server vs a plain repo (heuristic, ADR-0005 D2). MCP if a topic
 * flags it, or the name/description references MCP as a whole word / the protocol's name — avoiding
 * false positives on substrings (e.g. "mcphersons").
 */
export function classifyGitHubEntity(repo: {
  name: string;
  description?: string | null;
  topics?: string[];
}): "MCP_SERVER" | "REPO" {
  const topics = (repo.topics ?? []).map((t) => t.toLowerCase());
  if (topics.some((t) => MCP_TOPICS.has(t))) return "MCP_SERVER";
  const hay = `${repo.name} ${repo.description ?? ""}`.toLowerCase();
  if (/\bmcp\b/.test(hay) || hay.includes("model context protocol")) return "MCP_SERVER";
  return "REPO";
}

/** Map one HF/GitHub signal to a supply entity, or null if the source isn't a supply source. */
export function supplyEntityFromSignal(
  sourceKey: string,
  title: string | null,
  raw: unknown,
): { type: $Enums.EntityType; name: string } | null {
  if (!title) return null;
  if (sourceKey === HUGGINGFACE_KEY) return { type: "MODEL", name: title };
  if (sourceKey === GITHUB_KEY) {
    const r = (raw ?? {}) as { full_name?: string; description?: string | null; topics?: string[] };
    const type = classifyGitHubEntity({
      name: r.full_name ?? title,
      description: r.description,
      topics: r.topics,
    });
    return { type, name: title };
  }
  return null;
}

/**
 * Upsert supply entities from recent HF/GitHub signals and link each to the trends its signal belongs
 * to. Idempotent (upsertEntity de-dupes by (type,name); linkTrendEntity is upsert). Call in the
 * pipeline after clustering, before snapshots.
 */
export async function syncSupplyEntities(
  opts: { limit?: number } = {},
): Promise<{ upserted: number; linked: number }> {
  const signals = await prisma.signal.findMany({
    where: { source: { key: { in: [HUGGINGFACE_KEY, GITHUB_KEY] } } },
    orderBy: { fetchedAt: "desc" },
    take: opts.limit ?? 500,
    select: {
      title: true,
      raw: true,
      source: { select: { key: true } },
      trends: { select: { trendId: true } },
    },
  });
  const seen = new Set<string>();
  let upserted = 0;
  let linked = 0;
  for (const s of signals) {
    const mapped = supplyEntityFromSignal(s.source.key, s.title, s.raw);
    if (!mapped) continue;
    const entityId = await upsertEntity(mapped.type, mapped.name, {});
    const key = `${mapped.type}:${mapped.name}`;
    if (!seen.has(key)) {
      seen.add(key);
      upserted++;
    }
    for (const te of s.trends) {
      await linkTrendEntity(te.trendId, entityId);
      linked++;
    }
  }
  return { upserted, linked };
}
