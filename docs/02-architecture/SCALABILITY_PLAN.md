# Scalability Plan

**Phase 27 · Status: complete (plan) · Last updated: 2026-07-10**
**Traces to:** [System Design](SYSTEM_DESIGN.md) · [Infrastructure](../06-infra/INFRASTRUCTURE.md) · [ADR-0001](../adr/) · [TRD](../01-product/TECHNICAL_REQUIREMENTS_DOCUMENT.md)
**Realized in (scale path):** `services/*` (containerizable), `@aioi/cache`, `@aioi/queues` (BullMQ), pgvector.

This plan describes how the platform grows from the current single-region MVP to a multi-tenant SaaS
serving orders of magnitude more orgs, opportunities, and API traffic — **without a rewrite**. Every MVP
choice in [ADR-0001](../adr/) was made with a documented exit ramp; this document sequences those ramps,
names the bottlenecks in order, and states the triggers that justify each step. We scale when a metric
crosses a threshold — not speculatively.

## 1. Scaling principles

1. **Stateless compute, stateful data.** Web/API/workers hold no session state (state lives in Postgres
   - Redis), so horizontal scaling is "add replicas."
2. **Vertical first, then horizontal.** A bigger DB instance and a cache buy time cheaply; shard/replica
   only when a single primary is genuinely the ceiling.
3. **Decouple the write path from the read path.** Ingestion/scoring (async, bursty) must never contend
   with user-facing reads (synchronous, latency-sensitive).
4. **Cache aggressively, invalidate correctly.** Read-model + LLM caching absorbs most load; correctness
   of invalidation is the hard part (see the `caching` skill).
5. **Cost is a scaling axis.** LLM spend and DB IO scale with usage; budgets (per active user) are
   tracked and gate features, not just latency.

## 2. Current baseline (MVP)

- **Web:** Vercel standalone Next.js, RSC reads Postgres directly; auto-scales at the edge.
- **DB:** Neon Postgres 16 + pgvector (single region).
- **Background work:** GitHub Actions cron (ingest/score/alerts/newsletter/digest) — simple, cheap,
  serial-enough for MVP volumes.
- **Cache:** Redis read-model cache available; LLM scorecards cache-keyed.

This comfortably serves the demo and early customers. The sections below are ordered by _what breaks
first_ as load grows.

## 3. Bottlenecks, in the order they bite

### 3.1 Background throughput (first)

Cron-driven serial jobs are the first ceiling: as source count and org count grow, a single hourly run
can't keep freshness. **Ramp:** move the schedulers/workers to the standing **BullMQ** worker services
(`@aioi/queues` + `services/scheduler`/`ingestion-service`/`notification-service`), scaled independently
of the web tier, with per-source concurrency and backoff. Events (`signal.ingested`/`trend.updated`)
already model the decoupling. **Trigger:** ingestion freshness SLO missed, or a job exceeds its window.

### 3.2 Database read load (second)

RSC-direct reads plus API traffic concentrate on the primary. **Ramps, in order:**

1. Turn on the **Redis read-model cache** for dashboards/lists/public pages + Next.js ISR/CDN for SEO
   surfaces (see `caching`, `seo` skills).
2. Add **read replicas**; route read-only queries (dashboards, search, public API) to replicas, writes
   to the primary.
3. Enforce the query budget from the `performance` skill: every hot query indexed, no N+1, keyset
   pagination. **Trigger:** P95 read latency over budget, or replica lag acceptable but primary CPU hot.

### 3.3 Vector search (third)

pgvector with an HNSW index scales well into the millions of rows but eventually competes with OLTP for
memory. **Ramps:** tune HNSW params + `ivfflat`/partitioning; isolate embeddings to a replica or a
dedicated Postgres; only if it becomes the dominant cost, migrate to a dedicated vector store (the
ADR-0001 exit ramp). **Trigger:** semantic-search P95 over budget or index memory pressure on the primary.

### 3.4 LLM cost & latency (continuous)

Scales linearly with active users and re-scoring volume. **Ramps:** cache scorecards by content hash
(already keyed); batch embeddings; route cheap/expensive models per task via LiteLLM; add a request
budget per org/plan; degrade gracefully to cached scores under pressure. **Trigger:** cost-per-active-user
over target, or provider rate limits hit.

### 3.5 API & multi-tenant fairness (with growth)

Public API + MCP traffic must not let one tenant starve others. **Ramps:** plan-aware rate limiting
(already present), per-org quotas, queue-based backpressure on expensive endpoints, and connection
pooling (PgBouncer / Neon pooler) so replica count isn't capped by Postgres connections.

## 4. The compute migration path

Per [INFRASTRUCTURE](../06-infra/INFRASTRUCTURE.md), the sequence is deliberate and per-service — the
code and Dockerfiles already exist, so each step is an ops change:

```
MVP:      Vercel (web) + Neon + GitHub Actions cron
  │  trigger: background throughput / need standing workers
Stage 1:  + Fly.io containers for api + workers + Redis (BullMQ/Streams) + Cloudflare CDN/WAF
  │  trigger: multi-region, compliance, or org-scale beyond Fly comfort
Stage 2:  AWS — ECS Fargate or EKS (infra/kubernetes) + RDS Postgres (Multi-AZ + replicas)
          + ElastiCache Redis + SQS/EventBridge bus + S3/CloudFront (or keep R2)
```

The `kubernetes` skill and `infra/kubernetes` manifests document the EKS target (Deployments, HPA,
NetworkPolicies, probes, PodSecurity). This is the **documented scale target, not the MVP host** — favour
correctness and safety over cleverness when it's built.

## 5. Data-tier scaling detail

- **Vertical:** bigger Neon/RDS instance + connection pooling is the cheapest first move.
- **Read replicas:** route reads; accept eventual consistency for dashboards/search, keep writes + RLS on
  the primary.
- **Partitioning:** time-partition high-volume append tables (signals, ingestion runs, audit, momentum
  snapshots); archive cold partitions to object storage.
- **Sharding (last resort):** shard by `organizationId` if a single primary can't hold write volume —
  tenancy is already the natural shard key (RLS enforces isolation).
- **Backups/DR:** automated snapshots + PITR; documented restore runbook (DR is a cross-cutting doc).

## 6. Capacity targets (illustrative, tune against real load)

| Dimension            | MVP comfort | Stage-1 target | Ceiling before next ramp        |
| -------------------- | ----------- | -------------- | ------------------------------- |
| Orgs                 | 100s        | 10k+           | primary write CPU / connections |
| Trends (rows)        | 100k        | millions       | HNSW memory on primary          |
| Ingestion freshness  | hourly      | minutes        | worker concurrency              |
| API RPS              | modest      | 100s sustained | replica read capacity           |
| LLM cost/active user | tracked     | held to target | provider limits / budget        |

These are planning numbers; real thresholds come from the observability signals in
[OBSERVABILITY](../06-infra/OBSERVABILITY.md) §7. **Do not pre-build for them.**

## 7. What we explicitly do NOT do yet

- No Kubernetes, no multi-region, no dedicated vector DB, no sharding at MVP — each has a trigger above.
- No premature microservice splitting beyond the existing service seams.
- No speculative autoscaling policy until the metric pipeline (Prometheus/OTel) is externalized.

## 8. Review triggers

Re-open this plan when any holds for a sustained window: ingestion freshness SLO missed; DB primary CPU

> 70%; semantic-search or read P95 over budget; LLM cost/user over target; or a compliance/residency
> requirement forces multi-region. Record the decision as an ADR before executing the ramp.
