---
name: backend
description: >-
  Deep engineering guidance for building backend services in the AI Opportunity Intelligence
  Platform — Fastify + tRPC (internal) + REST/OpenAPI (public) over Prisma/Postgres, Redis, and
  BullMQ. Use when creating or reviewing anything in services/api, services/*-service, or the data
  access in @aioi/database: routers, endpoints, service-layer logic, validation, RBAC, multi-tenancy,
  pagination, idempotency, error handling, rate limiting, webhooks, or background jobs.
---

# Backend Engineering

Opinionated, project-specific rules for services in this monorepo. The backend is a **thin transport
layer over a single service layer**: tRPC and REST are two doors into the same business logic; the
logic lives in `services/<svc>/src/modules/<domain>/service.ts` and never in a route handler. All DB
access goes through `@aioi/database`; all validation through `@aioi/validation` (Zod); all auth/RBAC
through `@aioi/auth`. See [ARCHITECTURE](../../ARCHITECTURE.md), [API design](../../../docs/05-api/API_DESIGN.md),
[DB design](../../../docs/04-data/DATABASE_DESIGN.md).

## When to apply

- Adding/changing a tRPC procedure or a REST endpoint under `/api/v1`.
- Writing service-layer business logic, repositories, or a background job/worker.
- Reviewing a PR that touches `services/*` or `packages/database`.
- Designing pagination, idempotency, rate limiting, error contracts, or webhook handling.

## Rule categories by priority

| Priority | Category | Why it matters |
|---|---|---|
| **CRITICAL** | Tenancy & RBAC | A missing check leaks another org's data. Non-negotiable. |
| **CRITICAL** | Input validation | Unvalidated input is the root of injection, corruption, crashes. |
| **CRITICAL** | Idempotency & data integrity | Retries/at-least-once delivery must not double-write. |
| **HIGH** | Layering (transport vs service) | Duplicated logic across tRPC/REST rots fast. |
| **HIGH** | Error contract | Leaky/inconsistent errors break clients and expose internals. |
| **HIGH** | Rate limiting & abuse | Public API + ingestion must not be DoS-able or run away on cost. |
| **MEDIUM** | Pagination & query shape | Unbounded queries kill Postgres under load. |
| **MEDIUM** | Observability | Every request traced + mutations audited or you're blind in prod. |
| **LOW** | Response ergonomics | Consistent envelopes, casing, and OpenAPI accuracy. |

## Quick reference — the rules

### 1. Tenancy & RBAC (CRITICAL)
- Every tenant-scoped query is filtered by `organizationId`. Never trust a client-supplied org id —
  derive it from the authenticated context (`ctx.orgId`).
- Check permission **before** doing work; deny by default. Use `@aioi/auth`'s `can(ctx, action)`.
- Rely on **both** app-layer tenant guard **and** Postgres RLS (`SET LOCAL app.current_org`) — defense in depth.
- Global intelligence tables (`Signal`, `Trend`, `Score`, `Entity`) are read-shared and have no RLS;
  never write tenant data into them.

### 2. Input validation (CRITICAL)
- Validate **all** external input at the boundary with a Zod schema from `@aioi/validation`. Infer
  types with `z.infer` — one source of truth for tRPC input, REST body, and the client form.
- Reject with 422 (REST) / `BAD_REQUEST` (tRPC) and field-level errors. Never `as any` past the boundary.
- Coerce and bound: `.max()` on limits, `.trim()` on strings, enums for controlled vocab.

### 3. Idempotency & integrity (CRITICAL)
- Writes accept an `Idempotency-Key` header; dedupe for 24h (Redis). Ingestion upserts by a stable
  unique key (`Signal(sourceId, externalId)`); scores upsert by `(trendId, dimension, rubricVersion)`.
- Wrap multi-write operations in a Prisma `$transaction`. Never partially apply.
- Background jobs are idempotent — assume at-least-once delivery.

### 4. Layering (HIGH)
- Route handler = parse context → call `service.method(input, ctx)` → map result to transport. No
  Prisma calls, no business rules in the handler.
- The same `service.method` backs both the tRPC procedure and the REST route → zero duplication.

### 5. Error contract (HIGH)
- Internal: throw typed `TRPCError` with a machine `code`. REST edge: map to **RFC 9457**
  `application/problem+json` (`type,title,status,detail,code,instance`). Never leak stack traces,
  SQL, or provider errors to clients — log those, return a safe message.

### 6. Rate limiting & cost (HIGH)
- Per-IP + per-API-key token buckets in Redis; emit `RateLimit-*` headers; 429 + `Retry-After`.
- Endpoints that trigger LLM work carry an org-level cost cap (see the `ai` skill).

### 7. Pagination & queries (MEDIUM)
- Cursor pagination (`?cursor=&limit=`), `limit ≤ 100`, response `{ data, nextCursor }`. Never offset
  pagination on hot tables. `select` only needed columns; avoid N+1 (use `include`/`in` batching).

### 8. Observability (MEDIUM)
- Every request gets an OTel span; log via `@aioi/logger` with `traceId`+`orgId` (never secrets/PII).
- Every mutating/privileged action writes an `AuditLog` row (actor, org, action, target, ip, ts).

## Patterns — good vs bad (our stack)

**Layering + tenancy + validation, together:**
```ts
// ❌ BAD — logic + Prisma + no RBAC/tenant scoping in the transport
export const listWatchlists = publicProcedure.query(({ ctx }) =>
  prisma.watchlist.findMany(), // leaks ALL orgs' watchlists
);

// ✅ GOOD — thin procedure -> service; RBAC + tenant scope + validated input
// modules/watchlist/service.ts
export async function listWatchlists(ctx: Ctx, input: ListInput) {
  await requirePermission(ctx, "watchlists:read");       // deny by default
  return watchlistRepo.listByOrg(ctx.orgId, input.limit); // repo scopes by organizationId
}
// router.ts
list: protectedProcedure
  .input(listWatchlistInput)                              // Zod from @aioi/validation
  .query(({ ctx, input }) => listWatchlists(ctx, input));
```

**Error mapping at the REST edge:**
```ts
// ✅ GOOD — one error boundary; RFC 9457 out, internals stay in the logs
app.setErrorHandler((err, req, reply) => {
  const problem = toProblemJson(err);        // maps TRPCError/AppError -> {type,title,status,code}
  req.log.error({ err, traceId: req.id }, "request failed");
  reply.code(problem.status).type("application/problem+json").send(problem);
});
```

**Idempotent write:**
```ts
// ✅ GOOD — dedupe + transaction
export async function createReport(ctx: Ctx, input: CreateReport, key?: string) {
  await requirePermission(ctx, "reports:write");
  if (key && (await idempotency.seen(ctx.orgId, key))) return idempotency.result(key);
  const report = await prisma.$transaction((tx) => reportRepo.create(tx, ctx.orgId, input));
  await audit(ctx, "report.create", report.id);
  if (key) await idempotency.store(key, report);
  return report;
}
```

## Step-by-step: add a backend capability

1. **Contract first** — define the Zod input/output in `@aioi/validation`; add the REST shape to
   `docs/05-api/openapi.yaml` if public.
2. **Service** — implement `modules/<domain>/service.ts` (RBAC → tenant-scoped repo → transaction →
   audit). Pure, testable, transport-agnostic.
3. **Repository** — add tenant-scoped queries in `@aioi/database` with correct indexes.
4. **Wire transports** — tRPC procedure (`protectedProcedure`) and/or REST route calling the service.
5. **Guardrails** — rate limit, idempotency key (writes), pagination (lists).
6. **Tests** — unit the service (fake repo), integration the router against a live DB (guard with
   `DATABASE_URL`), and a REST contract test.
7. **Observe** — span + structured logs + audit entry.
8. **Docs** — update API_DESIGN/openapi + CHANGELOG + changeset.

## Decision guide

| Situation | Do | Don't |
|---|---|---|
| First-party web client | tRPC (`protectedProcedure`) | Hand-rolled REST for our own app |
| Third party / extension / webhook | REST + OpenAPI, API-key auth | tRPC (bad for external consumers) |
| Multi-row write | `$transaction` + idempotency key | Sequential un-transacted writes |
| Long/expensive work | enqueue a BullMQ job, return `202`/job id | Block the request thread |
| Cross-service call | emit an event on the bus | Direct HTTP coupling between workers |
| Listing a hot table | cursor pagination + index | `findMany()` unbounded / offset paging |

## Failure modes → fixes

| Symptom | Likely cause | Fix |
|---|---|---|
| Cross-tenant data visible | query not scoped by `organizationId` / RLS off | Scope in repo; set RLS org context; add a test |
| Duplicate rows after retry | non-idempotent write | Unique key + upsert or idempotency key |
| p95 latency spikes under load | N+1 or unbounded query | `include`/batch; cursor paginate; add index |
| Client sees stack trace/SQL | error not mapped at edge | Central error handler → RFC 9457 |
| Runaway LLM spend | endpoint triggers uncapped AI | Cost cap + cache (see `ai` skill) |
| Worker crash-loops on one message | poison message, no isolation | Try/catch per item, quarantine + alert |

## Pre-delivery checklist

- [ ] RBAC checked before work; deny by default
- [ ] Every tenant query scoped by `organizationId` (+ RLS); no client-supplied org ids trusted
- [ ] All input Zod-validated at the boundary; no `any`
- [ ] Business logic in the service layer; handler is thin; tRPC + REST share it
- [ ] Writes idempotent (unique key / idempotency header) and transactional
- [ ] Errors mapped to RFC 9457 (REST) / typed `TRPCError` (tRPC); nothing leaked
- [ ] Lists cursor-paginated (`limit ≤ 100`); no N+1; hot queries indexed
- [ ] Rate limits + cost caps on public/AI endpoints
- [ ] OTel span + structured logs (no secrets/PII) + `AuditLog` on mutations
- [ ] Unit (service) + integration (router vs DB) + REST contract tests green
- [ ] OpenAPI + CHANGELOG + changeset updated

## References
[API_DESIGN](../../../docs/05-api/API_DESIGN.md) · [DATABASE_DESIGN](../../../docs/04-data/DATABASE_DESIGN.md) ·
[CODE_GUIDELINES](../../../docs/08-quality/CODE_GUIDELINES.md) · skills: `database`, `auth`, `security`, `queues`, `caching`.
