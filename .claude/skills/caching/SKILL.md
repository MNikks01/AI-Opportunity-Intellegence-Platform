---
name: caching
description: >-
  Deep caching guidance for the AI Opportunity Intelligence Platform — Redis read-model caching, HTTP/
  CDN + Next.js ISR, LLM scorecard caching, and correct invalidation. Use when caching dashboard data,
  API responses, embeddings/scores, or public pages; when designing cache keys/TTLs; or when debugging
  stale data, cache stampedes, or cross-tenant cache leaks.
---

# Caching

Caching makes dashboards fast and LLM usage cheap — but a wrong cache leaks tenants or serves stale
data. The layered strategy here: **Redis read-model cache** (dashboards/API), **Next.js ISR + CDN**
(public pages), **scorecard cache** keyed by rubric version (LLM cost), and **React Query** SWR on the
client. The hard part is always **invalidation + key scoping**. See [performance](../performance/SKILL.md),
[database](../database/SKILL.md), [TRD §8](../../../docs/01-product/TECHNICAL_REQUIREMENTS_DOCUMENT.md).

## When to apply

- Caching dashboard/API read data, public pages, embeddings, or LLM scorecards.
- Designing cache keys, TTLs, and invalidation. Debugging staleness/stampede/leaks.

## Rule categories by priority

| Priority | Category | Why |
|---|---|---|
| **CRITICAL** | Tenant-scoped keys | An unscoped key serves one org's data to another. |
| **CRITICAL** | Correct invalidation | Stale scores/dashboards mislead users acting on them. |
| **HIGH** | Cache the right thing | Cache read models/derived results, not raw rows. |
| **HIGH** | Stampede protection | Expiry on a hot key can hammer the DB/LLM. |
| **MEDIUM** | TTL strategy | Balance freshness vs load; SWR for smoothness. |
| **MEDIUM** | Treat cache as ephemeral | Redis is rebuildable; never the source of truth. |

## Cache layers (this project)

| Layer | Tech | Caches | Invalidation |
|---|---|---|---|
| Client | React Query | server responses | SWR + query-key invalidation |
| Read model | Redis | dashboards, board aggregates | event (`trend.updated`) + TTL |
| LLM | Redis / DB | scorecards by `(trend,dim,rubricVersion)` | rubric bump / material change |
| Embeddings | DB/Redis | vectors | re-embed on model/chunking change |
| Public | Next ISR + CDN | marketing/topic/teaser pages | `revalidate` / on-publish |

## Quick reference — the rules

### 1. Tenant-scoped keys (CRITICAL)
- Every tenant cache key includes `organizationId` (and workspace where relevant):
  `board:${orgId}:${filtersHash}`. Never a global key for tenant data. Global intelligence
  (trends/scores) may be shared but check whether the view is org-personalized.

### 2. Invalidation (CRITICAL)
- Prefer event-driven invalidation over guessing TTLs: on `trend.updated`, bust affected dashboard/
  board keys and let SWR refill. Scorecards regenerate on rubric bump or material signal change.
- Version keys where possible (`rubricVersion`, a `schemaVersion` prefix) so a bump auto-invalidates.

### 3. Cache the right thing (HIGH)
- Cache **read models / derived aggregates** (the dashboard payload), not raw rows you'd re-shape
  anyway. Don't cache per-user-mutating or auth-sensitive data without care.

### 4. Stampede protection (HIGH)
- Use `getOrSet` with a single-flight lock (or `SETNX`) so only one worker recomputes on miss; others
  wait/serve stale. Add jitter to TTLs to avoid synchronized expiry.

### 5. TTL & SWR (MEDIUM)
- Short TTL + event invalidation for volatile data; longer for stable. Serve-stale-while-revalidate to
  hide recompute latency. Never rely on TTL alone for correctness-critical freshness.

### 6. Ephemeral (MEDIUM)
- Redis is rebuildable; the DB is the source of truth. Design so a cold cache degrades (slower), never
  breaks. No critical-only state in Redis.

## Patterns — good vs bad

**Scoped key + single-flight + invalidation:**
```ts
// ❌ BAD — global key (cross-tenant leak), no stampede guard
const board = await redis.get("board") ?? await compute();

// ✅ GOOD — org-scoped key, single-flight, TTL + jitter
const key = `board:${orgId}:${filtersHash}`;
const board = await cache.getOrSet(key, () => computeBoard(orgId, filters), {
  ttl: 60 + Math.floor(Math.random() * 15),   // jitter
  singleFlight: true,                          // only one recompute on miss
});

// on event
bus.on("trend.updated", ({ orgIds }) => orgIds.forEach((o) => cache.delByPrefix(`board:${o}:`)));
```

**Version-keyed LLM cache (auto-invalidates on rubric bump):**
```ts
// ✅ GOOD — bumping RUBRIC_VERSION makes old entries unreachable
const key = `score:${trendId}:${dimension}:${RUBRIC_VERSION}`;
return cache.getOrSet(key, () => scoreDimension(dimension, trend));
```

## Step-by-step: add a cache

1. Decide the layer (client/Redis/ISR/LLM) and whether data is tenant-scoped.
2. Design the key: include `organizationId` + a stable hash of inputs (+ a version where relevant).
3. Choose invalidation: event-driven (preferred) and/or TTL (with jitter). Add single-flight for hot keys.
4. Ensure cold-cache degrades gracefully (no correctness dependency on cache).
5. Test: hit/miss, invalidation on event, cross-tenant isolation, stampede under concurrency.
6. Observe hit rate + latency. CHANGELOG + changeset.

## Decision guide

| Data | Cache where | Invalidate by |
|---|---|---|
| Dashboard aggregate | Redis (org-scoped) | `trend.updated` event + TTL |
| Trend scorecard (LLM) | Redis/DB | rubric version / material change |
| Public page | Next ISR + CDN | `revalidate` / on publish |
| Server response (client) | React Query | query-key invalidation (SWR) |
| Embedding | DB/Redis | re-embed on model change |

## Failure modes → fixes

| Symptom | Cause | Fix |
|---|---|---|
| One org sees another's data | unscoped key | include `organizationId` in the key |
| Users act on stale scores | no/incorrect invalidation | event invalidation + version keys |
| DB/LLM spikes on expiry | cache stampede | single-flight lock + TTL jitter |
| Cold start breaks app | cache treated as source of truth | fall back to DB; degrade gracefully |
| Cache never hits | key varies per request (unstable hash) | stable, normalized key inputs |

## Pre-delivery checklist

- [ ] Tenant data keys include `organizationId` (+ workspace/filters hash); no global tenant keys
- [ ] Invalidation is event-driven (`trend.updated`) and/or versioned; TTL is a backstop
- [ ] Caches read models / derived results, not raw rows
- [ ] Single-flight + TTL jitter on hot keys (no stampede)
- [ ] Cold cache degrades gracefully; DB remains source of truth
- [ ] LLM scorecards keyed by `(trendId, dimension, rubricVersion)`
- [ ] Tests: hit/miss, invalidation, cross-tenant isolation, concurrency
- [ ] Hit-rate/latency observed; CHANGELOG + changeset

## References
skills: `performance`, `database`, `queues`, `ai`, `backend` · [TRD §8](../../../docs/01-product/TECHNICAL_REQUIREMENTS_DOCUMENT.md).
