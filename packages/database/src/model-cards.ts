/**
 * Open-source model tracker reads (AI/tech vertical). Lists Entities of type MODEL with their optional
 * `ModelCard` detail (license, params, GGUF/Ollama/vLLM/MLX support, benchmarks). Entities are global
 * (no RLS). The cards are populated in M9; until then this returns tracked models with null detail.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "./client";

export interface ModelCardView {
  entityId: string;
  name: string;
  license: string | null;
  paramsB: number | null;
  ggufAvailable: boolean;
  ollamaTag: string | null;
  mlxAvailable: boolean;
  vllmSupported: boolean;
  transformers: boolean;
  weightsUrl: string | null;
  benchmarks: unknown;
  /** Number of trends this model is linked to (a rough salience signal). */
  linkedTrendCount: number;
}

export interface ModelCardFilters {
  /** Only models with GGUF weights available. */
  gguf?: boolean;
  /** Minimum parameter count in billions. */
  paramsMin?: number;
}

/** List tracked models (Entity type=MODEL) with their card detail, most-linked first. */
export async function listModelCards(
  filters: ModelCardFilters = {},
  limit = 50,
): Promise<ModelCardView[]> {
  const rows = await prisma.entity.findMany({
    where: {
      type: "MODEL",
      ...(filters.gguf ? { modelCard: { ggufAvailable: true } } : {}),
      ...(filters.paramsMin !== undefined
        ? { modelCard: { paramsB: { gte: filters.paramsMin } } }
        : {}),
    },
    select: {
      id: true,
      name: true,
      modelCard: true,
      _count: { select: { trends: true } },
    },
    take: limit,
    orderBy: { trends: { _count: "desc" } },
  });

  return rows.map((e) => ({
    entityId: e.id,
    name: e.name,
    license: e.modelCard?.license ?? null,
    paramsB: e.modelCard?.paramsB ?? null,
    ggufAvailable: e.modelCard?.ggufAvailable ?? false,
    ollamaTag: e.modelCard?.ollamaTag ?? null,
    mlxAvailable: e.modelCard?.mlxAvailable ?? false,
    vllmSupported: e.modelCard?.vllmSupported ?? false,
    transformers: e.modelCard?.transformers ?? false,
    weightsUrl: e.modelCard?.weightsUrl ?? null,
    benchmarks: e.modelCard?.benchmarks ?? null,
    linkedTrendCount: e._count.trends,
  }));
}

export interface ModelToEnrich {
  entityId: string;
  /** The entity name doubles as the Hugging Face repo id for HF-sourced models. */
  name: string;
}

/** MODEL entities to (re)enrich, most-linked first. Enrichment is idempotent, so all are eligible. */
export async function listModelsForEnrichment(limit = 50): Promise<ModelToEnrich[]> {
  const rows = await prisma.entity.findMany({
    where: { type: "MODEL" },
    select: { id: true, name: true },
    take: limit,
    orderBy: { trends: { _count: "desc" } },
  });
  return rows.map((e) => ({ entityId: e.id, name: e.name }));
}

export interface ModelCardInput {
  license?: string | null;
  paramsB?: number | null;
  ggufAvailable?: boolean;
  ollamaTag?: string | null;
  mlxAvailable?: boolean;
  vllmSupported?: boolean;
  transformers?: boolean;
  weightsUrl?: string | null;
  benchmarks?: unknown;
}

/** Upsert a model's card detail (M9). Idempotent by entityId; safe to re-run as HF metadata changes. */
export async function upsertModelCard(entityId: string, card: ModelCardInput): Promise<void> {
  const benchmarks =
    card.benchmarks === undefined || card.benchmarks === null
      ? undefined
      : (card.benchmarks as Prisma.InputJsonValue);
  const data = {
    license: card.license ?? null,
    paramsB: card.paramsB ?? null,
    ggufAvailable: card.ggufAvailable ?? false,
    ollamaTag: card.ollamaTag ?? null,
    mlxAvailable: card.mlxAvailable ?? false,
    vllmSupported: card.vllmSupported ?? false,
    transformers: card.transformers ?? false,
    weightsUrl: card.weightsUrl ?? null,
    ...(benchmarks !== undefined ? { benchmarks } : {}),
  };
  await prisma.modelCard.upsert({
    where: { entityId },
    create: { entityId, ...data },
    update: data,
  });
}
