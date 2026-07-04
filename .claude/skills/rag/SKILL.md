---
name: rag
description: >-
  Deep guidance for retrieval-augmented generation and semantic search in the AI Opportunity
  Intelligence Platform — embeddings in pgvector, retrieval + rerank, grounded answers, and
  faithfulness gating via llm-eval-harness. Use when building semantic/RAG search, the Knowledge Base,
  chunking/embedding pipelines, or any feature where the model answers over retrieved context.
---

# RAG & Semantic Search

Retrieval is only as good as its grounding. In this platform, embeddings live in **pgvector** (HNSW,
cosine), retrieval feeds an LLM through `@aioi/ai-sdk`, and **every RAG answer must cite its context
and pass a faithfulness gate** in `llm-eval-harness`. Semantic search powers the Knowledge Base, RAG
Search, and the semantic mode of global search. See [DB design](../../../docs/04-data/DATABASE_DESIGN.md),
[SYSTEM_DESIGN §RAG](../../../docs/02-architecture/SYSTEM_DESIGN.md).

## When to apply

- Building semantic/RAG search, the Knowledge Base, or "ask over trends/entities".
- Writing chunking/embedding/indexing pipelines or a reranker.
- Diagnosing poor recall, hallucinated answers, or stale results.

## The RAG pipeline (this project)

`query → embed → kNN (pgvector HNSW) → rerank → assemble grounded prompt → generate → validate + cite`

Keep each stage separable and testable. Embeddings are also written during ingestion/scoring so
trends/entities are searchable as soon as they exist.

## Rule categories by priority

| Priority | Category | Why |
|---|---|---|
| **CRITICAL** | Grounding & citations | Ungrounded answers destroy trust; every claim cites a source. |
| **CRITICAL** | Faithfulness gating | RAG changes must pass `llm-eval-harness` (faithfulness/relevance). |
| **HIGH** | Chunking quality | Bad chunks → bad recall; the #1 RAG failure. |
| **HIGH** | Index correctness | HNSW params + distance must match the embedding model. |
| **HIGH** | Retrieval → rerank | kNN alone is noisy; rerank before generation. |
| **MEDIUM** | Freshness | Stale index = wrong answers; embed on write. |
| **MEDIUM** | Cost & latency | Embedding + generation must stay within budget. |

## Quick reference — the rules

### 1. Grounding & citations (CRITICAL)
- The prompt instructs the model to answer **only** from provided context and to cite chunk ids;
  refuse (or say "insufficient evidence") when context is thin. Return citations that resolve to
  real signals/entities. Never present ungrounded generation as fact.

### 2. Faithfulness gating (CRITICAL)
- Any change to chunking, embedding model, retrieval params, reranker, or the answer prompt requires a
  green `llm-eval-harness` run (faithfulness + relevance + citation-validity + cost/latency) with a
  new golden case.

### 3. Chunking (HIGH)
- Chunk on semantic boundaries (sections/paragraphs), not fixed byte windows; keep overlap small.
- Attach metadata to every chunk: `ownerType/ownerId`, source, title, position — for citations + filters.
- Store the embedding model + dims with each vector (so re-embeds are detectable).

### 4. Index (HIGH)
- pgvector column + **HNSW** index via raw SQL migration; **cosine** distance for normalized
  embeddings. Filter by `ownerType`/tenant before/with the kNN. Tune `m`/`ef_search` for recall vs latency.

### 5. Retrieve → rerank (HIGH)
- Over-fetch kNN (e.g., top-50) then rerank (cross-encoder or LLM-judge) down to the few chunks that
  actually go in the prompt. Deduplicate near-identical chunks.

### 6. Freshness (MEDIUM)
- Embed on write (ingestion/scoring) so new trends are immediately searchable. Re-embed when the model
  or chunking changes (backfill job). Track index build/version.

### 7. Cost & latency (MEDIUM)
- Cache embeddings; batch embed. Keep context tight (top-k after rerank), compress if large. Target
  semantic search < 500ms p75; budget generation cost per query.

## Patterns — good vs bad

**Grounded generation with citations:**
```ts
// ❌ BAD — dumps everything, no citations, model free to invent
const answer = await llm.ask(`Answer: ${query}\n${allTrendsText}`);

// ✅ GOOD — retrieve→rerank→cite; validate
const hits = await vectorSearch(queryVec, { ownerType: "TREND", k: 50 });
const top = await rerank(query, hits).then((r) => r.slice(0, 6));
const res = await provider.answerWithContext({
  query,
  context: top.map((c) => ({ id: c.id, text: c.text })),   // ids for citations
  instruction: "Answer ONLY from context; cite chunk ids; say 'insufficient evidence' if unsupported.",
});
ragAnswerSchema.parse(res); // enforces citations[] non-empty
```

**pgvector kNN (raw SQL, tenant/type filtered):**
```ts
// ✅ GOOD — HNSW cosine, filtered, over-fetch for rerank
const hits = await prisma.$queryRaw<Array<{ id: string; text: string; dist: number }>>`
  SELECT e."ownerId" AS id, e.text, e.embedding <=> ${queryVec}::vector AS dist
  FROM "Embedding" e
  WHERE e."ownerType" = 'TREND'
  ORDER BY e.embedding <=> ${queryVec}::vector
  LIMIT 50`;
```

**Chunking with metadata:**
```ts
// ✅ GOOD — semantic chunks + provenance for citations + re-embed detection
const chunks = splitOnHeadings(doc).map((text, i) => ({
  ownerType: "TREND", ownerId: trend.id, position: i, text,
  model: EMBED_MODEL, dims: 1536,
}));
```

## Step-by-step: add a RAG feature

1. Define the answer schema (must include `citations[]`) in `@aioi/validation`.
2. Chunk + embed the corpus (with metadata); write vectors on ingestion/scoring.
3. Ensure the HNSW index + correct distance (raw SQL migration).
4. Implement retrieve → rerank → grounded prompt → validate/cite through `@aioi/ai-sdk`.
5. Add a golden set (queries + expected supported/unsupported); wire the faithfulness gate in CI.
6. Cache embeddings; measure recall + latency + cost. Docs + CHANGELOG + changeset.

## Decision guide

| Need | Do | Don't |
|---|---|---|
| Exact keyword match | Postgres FTS | semantic search |
| Meaning/similarity | pgvector HNSW cosine | brute-force in app |
| Better precision | over-fetch + rerank | trust raw kNN order |
| Answer over docs | grounded prompt + citations | free generation |
| Big context | rerank to top-k + compress | stuff everything |
| Model/chunking change | re-embed + re-eval | leave stale index |

## Failure modes → fixes

| Symptom | Cause | Fix |
|---|---|---|
| Hallucinated answers | ungrounded prompt / weak retrieval | cite-or-refuse prompt; rerank; eval gate |
| Poor recall | bad chunking / wrong distance / no HNSW | semantic chunks; cosine; HNSW; tune `ef_search` |
| Wrong/old answers | stale index | embed on write; re-embed on change |
| Slow search | no HNSW / huge context | HNSW; rerank to top-k; cache embeddings |
| Citations don't resolve | missing chunk metadata | store ownerType/ownerId/position |

## Pre-delivery checklist

- [ ] Prompt answers only from context and cites chunk ids; refuses when unsupported
- [ ] Answer schema requires non-empty `citations[]`; validated
- [ ] Semantic chunking + per-chunk metadata (owner/source/position/model/dims)
- [ ] pgvector HNSW index; distance matches embedding model; tenant/type filtered
- [ ] Retrieve over-fetch → rerank → top-k into prompt; dedup
- [ ] Embeddings written on ingestion/scoring; re-embed path on change
- [ ] `llm-eval-harness` faithfulness/relevance/citation gate green (+ golden case)
- [ ] Recall/latency/cost within budget; embeddings cached
- [ ] Docs + CHANGELOG + changeset updated

## References
[DATABASE_DESIGN](../../../docs/04-data/DATABASE_DESIGN.md) · [SYSTEM_DESIGN](../../../docs/02-architecture/SYSTEM_DESIGN.md) ·
skills: `ai`, `database`, `prompt-engineering`, `llm-eval-harness`, `performance`.
