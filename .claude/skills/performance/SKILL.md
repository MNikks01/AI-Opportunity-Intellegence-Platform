---
name: performance
description: >-
  Deep performance guidance for the AI Opportunity Intelligence Platform — frontend Core Web Vitals,
  backend/API latency, database query performance, caching, and (critically) LLM cost/latency. Use when
  a path is slow or hot (dashboards, scoring, ingestion, search), when adding caching, or when
  profiling against the PRD budgets. "LLM cost per active user" is a first-class product metric.
---

# Performance Engineering

Budgets from the PRD NFRs: **dashboard TTFB < 500ms p75 · API read p95 < 300ms · semantic search <
500ms p75 · brief generation < 60s/user batch**. Measure before optimizing. The two most product-
specific concerns are **read-model caching for dashboards** and **LLM cost/latency control** (per-trend
multi-score generation is token-heavy). Track "LLM cost per active user" as a headline metric. See
[TRD §8](../../../docs/01-product/TECHNICAL_REQUIREMENTS_DOCUMENT.md), skills `caching`, `ai`, `database`.

## When to apply

- A measured regression, or a hot path (Trend/Opportunity dashboards, scoring, ingestion, search).
- Adding caching, pagination, or streaming. Reviewing bundle size or query plans.
- Any change to LLM usage (cost/latency budget).

## Rule categories by priority

| Priority | Category | Why |
|---|---|---|
| **CRITICAL** | Measure first | Optimizing without data wastes effort + hides the real hotspot. |
| **CRITICAL** | LLM cost control | Uncapped scoring can blow the unit economics. |
| **HIGH** | Query performance | N+1 / missing indexes are the top backend killer. |
| **HIGH** | Caching read models | Dashboards must serve cached, not recompute per request. |
| **HIGH** | Frontend CWV & bundle | Slow/heavy pages hurt UX + SEO. |
| **MEDIUM** | Async offloading | Push slow work to queues; don't block requests. |
| **MEDIUM** | Regression gates | Catch slowdowns in CI/eval (cost + latency). |

## Budgets (targets)

| Surface | Metric | Budget |
|---|---|---|
| Dashboard | TTFB p75 | < 500ms |
| API read | p95 | < 300ms |
| Semantic search | p75 | < 500ms |
| Daily brief batch | per user | < 60s |
| Web public page | LCP / CLS / INP | good CWV |
| Scoring | cost/latency | within org cap; regression-gated |

## Quick reference — the rules

### 1. Measure first (CRITICAL)
- Profile with real signals: OTel traces, `EXPLAIN ANALYZE`, Langfuse (LLM cost/tokens/latency),
  Lighthouse/CWV, bundle analyzer. Optimize the actual hotspot, not a guess.

### 2. LLM cost (CRITICAL)
- Cache scorecards by `(trendId, dimension, rubricVersion)`; regenerate only on material change. Draft
  cheap / finalize strong; batch; compress context (headroom-ai). Enforce org cost caps; track
  cost/active user. Gate cost + latency in `llm-eval-harness`.

### 3. Query performance (HIGH)
- Index every hot `where`/`orderBy`; kill N+1 (`include`/batch); `select` only needed columns; cursor
  paginate. Read replicas for heavy reads at scale. Verify with `EXPLAIN ANALYZE`.

### 4. Caching read models (HIGH)
- Dashboards read cached, denormalized read models (Redis), invalidated on `trend.updated`. Client uses
  React Query stale-while-revalidate. CDN/ISR for public pages. (See `caching`.)

### 5. Frontend CWV & bundle (HIGH)
- RSC-first (small client bundles); stream with Suspense; code-split heavy client components;
  `next/image`; reserve space (no CLS); virtualize long lists/tables. Analyze the bundle.

### 6. Async offloading (MEDIUM)
- Long/expensive work → BullMQ jobs; return quickly (202/job id). Batch briefs/scoring. Backpressure +
  autoscale workers; scale to zero when idle.

### 7. Regression gates (MEDIUM)
- Track p95/cost over time; gate LLM cost/latency in eval; watch bundle size in CI.

## Patterns — good vs bad

**Cache the read model, invalidate on event:**
```ts
// ❌ BAD — recompute a heavy aggregate every request
const board = await computeOpportunityBoard(orgId);      // scans + joins per hit

// ✅ GOOD — cached read model; invalidated on trend.updated
const board = await cache.getOrSet(`board:${orgId}`, () => computeOpportunityBoard(orgId), { ttl: 60 });
// on `trend.updated`: cache.del(`board:*`) for affected orgs / SWR refresh
```

**Cap + cache LLM scoring:**
```ts
// ✅ GOOD — no recompute; cost tracked; capped
const key = cacheKey(trend.id, dim, RUBRIC_VERSION);
if (cache.has(key)) return cache.get(key);
if (await costGuard.overCap(orgId)) throw new TRPCError({ code: "TOO_MANY_REQUESTS" });
const score = await scoreDimension(dim, trend); // draft-cheap/finalize-strong upstream
```

**Kill N+1:**
```ts
// ❌ BAD                          // ✅ GOOD
for (const t of trends)            const trends = await prisma.trend.findMany({
  t.scores = await getScores(t.id)   include: { scores: true }, take: 50 });
```

## Step-by-step: fix a slow path

1. Reproduce + measure (trace/EXPLAIN/Langfuse/Lighthouse). Identify the dominant cost.
2. If DB: add index / remove N+1 / paginate. If dashboard: cache the read model + invalidation.
3. If LLM: cache by version, draft-cheap/finalize-strong, batch, compress, cap.
4. If frontend: RSC/stream/split/virtualize/`next/image`.
5. If long op: offload to a queue.
6. Re-measure vs budget; add a regression guard (cost/latency/bundle). CHANGELOG + changeset.

## Decision guide

| Slow thing | First move | Avoid |
|---|---|---|
| Dashboard | cache read model + invalidation | recompute per request |
| Query | index + kill N+1 + cursor page | offset paging / scans |
| LLM spend | cache by version + batch + cap | one strong call per item |
| Page load | RSC + stream + split | ship a big client bundle |
| Long request | queue it | block the thread |

## Failure modes → fixes

| Symptom | Cause | Fix |
|---|---|---|
| Slow dashboard | recompute / N+1 | cache read model; index; batch |
| API p95 spikes under load | unbounded/uncached queries | paginate; index; cache; replica |
| Runaway LLM bill | no cache/cap | cache by version; cost cap; batch; compress |
| Janky/slow page | heavy client JS / CLS | RSC; split; `next/image`; reserve space |
| Request timeouts | sync heavy work | offload to BullMQ |

## Pre-delivery checklist

- [ ] Measured before/after (trace, `EXPLAIN ANALYZE`, Langfuse, Lighthouse)
- [ ] Meets budget (TTFB<500ms p75 / API p95<300ms / search<500ms / brief<60s)
- [ ] Hot queries indexed; no N+1; cursor pagination; only needed columns
- [ ] Dashboards cached (read models) + invalidation; client SWR
- [ ] LLM: cached by rubric version, capped, batched, compressed; cost/active-user tracked
- [ ] Frontend: RSC/stream/split/virtualize; `next/image`; no CLS; bundle checked
- [ ] Long/expensive work offloaded to queues
- [ ] Regression guard (cost/latency/bundle); CHANGELOG + changeset

## References
[TRD §8](../../../docs/01-product/TECHNICAL_REQUIREMENTS_DOCUMENT.md) · skills: `caching`, `database`, `ai`, `queues`, `frontend`; installed `vercel-optimize` (if on Vercel).
