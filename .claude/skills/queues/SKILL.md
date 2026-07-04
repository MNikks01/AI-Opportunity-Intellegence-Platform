---
name: queues
description: >-
  Deep guidance for background jobs and the event bus in the AI Opportunity Intelligence Platform —
  BullMQ (scheduler + workers) and Redis Streams events (signal.ingested / trend.updated). Use when
  building the scheduler, ingestion/scoring/notification workers, repeatable/cron jobs, event
  producers/consumers, retries/backoff, idempotency, or handling poison messages and backpressure.
---

# Queues, Jobs & Events

The async plane is the product's engine: `scheduler → ingestion → signal.ingested → ai-service →
trend.updated → notification-service`. BullMQ runs jobs; Redis Streams carries events, behind a **thin
bus interface** so we can swap to NATS/SQS without touching producers/consumers. The non-negotiables:
**idempotent handlers** (at-least-once delivery), **backoff + jitter**, and **poison-message
quarantine** (never crash-loop a worker). See [SYSTEM_DESIGN](../../../docs/02-architecture/SYSTEM_DESIGN.md),
[ARCHITECTURE](../../ARCHITECTURE.md).

## When to apply

- Building the scheduler, or ingestion/scoring/notification workers.
- Adding a repeatable/cron job, a producer/consumer, or a webhook fan-out.
- Designing retries, idempotency, ordering, backpressure, or DLQ handling.

## Rule categories by priority

| Priority | Category | Why |
|---|---|---|
| **CRITICAL** | Idempotency | At-least-once delivery means handlers WILL re-run. |
| **CRITICAL** | Poison-message isolation | One bad message must not crash-loop the whole worker. |
| **HIGH** | Retries & backoff | Transient failures need backoff + jitter, bounded attempts. |
| **HIGH** | Bus abstraction | Producers/consumers must not couple to Redis specifics. |
| **HIGH** | Job hygiene | Small typed payloads (ids, not blobs); dedupe keys. |
| **MEDIUM** | Backpressure & scaling | Bound concurrency; autoscale; scale to zero when idle. |
| **MEDIUM** | Observability | Queue depth, lag, failures, DLQ must be visible. |

## Quick reference — the rules

### 1. Idempotency (CRITICAL)
- Every handler is safe to run twice. Use natural dedupe keys (upsert on `Signal(sourceId,externalId)`;
  score cache key) or a BullMQ `jobId` to dedupe enqueues. Side-effecting steps (email, webhook) carry
  an idempotency key so a retry doesn't double-send.

### 2. Poison messages (CRITICAL)
- Wrap per-item work in try/catch; on repeated failure, move the job to a **dead-letter queue** with
  context + alert — never let it block or crash-loop the worker. Ingestion skips a malformed item and
  counts it; the run continues.

### 3. Retries & backoff (HIGH)
- Exponential backoff **+ jitter**; bounded attempts. Honor `Retry-After` for HTTP sources. Distinguish
  retryable (5xx/429/timeout) from non-retryable (4xx/validation) — don't retry the latter.

### 4. Bus abstraction (HIGH)
- Publish/consume through a thin interface (`bus.emit(event, payload)` / consumer groups). Business
  logic never imports Redis Streams directly, so NATS/SQS is a swap.

### 5. Job hygiene (HIGH)
- Payloads are **small + typed** (ids + minimal params) — fetch the row in the handler; never stuff big
  blobs into Redis. Validate payloads with Zod on consume. Set timeouts.

### 6. Backpressure & scaling (MEDIUM)
- Bound worker concurrency; use rate limiters for source APIs (respect their limits). Autoscale workers
  on queue depth; scale to zero when idle. Prioritize watched-trend scoring.

### 7. Observability (MEDIUM)
- Emit metrics: queue depth, processing lag, success/failure, retry count, DLQ size. OTel span per job;
  structured logs (no secrets). Alert on backlog/DLQ growth.

## Patterns — good vs bad

**Idempotent, isolated consumer:**
```ts
// ❌ BAD — one bad item throws and crash-loops the whole batch; blind insert
worker.process(async (job) => {
  for (const item of job.data.items) await prisma.signal.create({ data: normalize(item) });
});

// ✅ GOOD — per-item isolation, upsert (idempotent), quarantine bad ones
worker.process(async (job) => {
  let inserted = 0, skipped = 0;
  for (const raw of job.data.items) {
    const parsed = signalSchema.safeParse(normalize(raw));
    if (!parsed.success) { skipped++; continue; }            // quarantine, keep going
    await signalRepo.upsert(parsed.data); inserted++;        // dedupes on unique key
  }
  logger.info({ inserted, skipped }, "ingest batch done");
});
```

**Backoff + jitter + bounded attempts:**
```ts
// ✅ GOOD — BullMQ job options
await queue.add("fetch", { sourceId, cursor }, {
  attempts: 5,
  backoff: { type: "exponential", delay: 2000 },   // + jitter in the worker for HTTP
  removeOnComplete: 1000, removeOnFail: false,      // keep failures for the DLQ
});
```

**Repeatable (cron) job via scheduler:**
```ts
// ✅ GOOD — dedup by jobId so a redeploy doesn't duplicate the schedule
await queue.add("hn-ingest", {}, { repeat: { pattern: "0 * * * *" }, jobId: "hn-ingest-hourly" });
```

**Event through the bus (not Redis directly):**
```ts
// ✅ GOOD — abstract interface; swappable transport
await bus.emit("signal.ingested", { signalIds });
bus.consume("signal.ingested", "ai-service", async ({ signalIds }) => scorePipeline(signalIds));
```

## Step-by-step: add a job/worker

1. Define a small, typed, Zod-validated payload (ids + params).
2. Producer enqueues via the queue/bus interface (dedupe `jobId` if repeatable).
3. Handler: validate → do work idempotently → per-item try/catch → emit follow-on event.
4. Retries: bounded attempts + exponential backoff + jitter; classify retryable vs not; DLQ on exhaustion.
5. Concurrency bound + source rate limits; timeouts.
6. Metrics + OTel span + logs. Tests: idempotent re-run, retryable failure, poison-message quarantine.
7. Register in the scheduler if periodic. CHANGELOG + changeset.

## Decision guide

| Situation | Do | Don't |
|---|---|---|
| Long/expensive request work | enqueue a job, return 202/job id | block the request |
| Cross-service reaction | emit a bus event | direct HTTP call between workers |
| Periodic task | repeatable job with stable `jobId` | ad-hoc `setInterval` |
| Transient failure | backoff + jitter, bounded | infinite tight retry |
| Validation failure | skip/DLQ, don't retry | retry a 4xx forever |
| Big data in a job | pass ids, fetch in handler | serialize blobs into Redis |

## Failure modes → fixes

| Symptom | Cause | Fix |
|---|---|---|
| Worker crash-loops | poison message not isolated | per-item try/catch + DLQ + alert |
| Duplicate side effects | non-idempotent handler | dedupe key / idempotency key / upsert |
| Thundering herd on source | no backoff/jitter/limit | exponential backoff + jitter + rate limit |
| Backlog grows unbounded | no autoscaling/backpressure | scale on depth; bound concurrency; prioritize |
| Can't swap broker later | Redis coupling in logic | go through the bus interface |

## Pre-delivery checklist

- [ ] Handler idempotent (dedupe/upsert/idempotency key); safe to run twice
- [ ] Per-item isolation; poison messages quarantined to a DLQ + alert (no crash-loop)
- [ ] Bounded attempts + exponential backoff + jitter; retryable vs non-retryable classified
- [ ] Payload small + typed + Zod-validated (ids, not blobs); timeouts set
- [ ] Producers/consumers use the bus/queue interface (Redis not imported in logic)
- [ ] Concurrency bounded; source rate limits respected; autoscale/scale-to-zero
- [ ] Metrics (depth/lag/fail/DLQ) + OTel span + logs; alerts on backlog/DLQ
- [ ] Tests: idempotency, retry, quarantine; CHANGELOG + changeset

## References
[SYSTEM_DESIGN](../../../docs/02-architecture/SYSTEM_DESIGN.md) · [ARCHITECTURE](../../ARCHITECTURE.md) ·
skills: `backend`, `data-source-integration`, `ai`, `caching`, `performance`.
