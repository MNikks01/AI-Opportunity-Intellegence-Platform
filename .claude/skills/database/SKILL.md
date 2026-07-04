---
name: database
description: >-
  Deep guidance for the data layer of the AI Opportunity Intelligence Platform — Prisma + PostgreSQL 16
  + pgvector, owned entirely by @aioi/database. Use when changing schema.prisma, writing/optimizing
  queries or repositories, authoring migrations, designing indexes, adding vector/full-text search,
  enforcing multi-tenancy (RLS), planning backfills, or reviewing anything under packages/database.
---

# Database Engineering

Postgres 16 + `pgvector`, accessed **only** through `@aioi/database` (Prisma client singleton +
repository functions). Services never import `@prisma/client` directly. The schema separates **global
intelligence** (Signal/Trend/Score/Entity/ActionPlan/Embedding — shared, no RLS) from **tenant data**
(Organization/Workspace/Watchlist/Alert/Brief/Report/ApiKey/AuditLog — scoped by `organizationId` +
RLS). Canonical design: [DATABASE_DESIGN](../../../docs/04-data/DATABASE_DESIGN.md) · [ERD](../../../docs/04-data/ERD.md).

## When to apply

- Editing `packages/database/prisma/schema.prisma` or adding a migration.
- Writing or optimizing a repository query; diagnosing slow queries / N+1.
- Adding full-text (FTS) or semantic (pgvector) search.
- Enforcing tenant isolation, planning a backfill, or reviewing a migration PR.

## Rule categories by priority

| Priority | Category | Why |
|---|---|---|
| **CRITICAL** | Migration safety | A bad migration locks a hot table or loses data in prod. |
| **CRITICAL** | Multi-tenant isolation | RLS + scoped queries are the last line against cross-tenant leaks. |
| **CRITICAL** | Idempotency keys | Ingestion/scoring dedupe depends on the right unique constraints. |
| **HIGH** | Indexing hot paths | Missing indexes = table scans = outages under load. |
| **HIGH** | Query shape (N+1, over-fetch) | The commonest latency/cost killer. |
| **MEDIUM** | Vector & FTS correctness | Search quality + recall depend on index type/params. |
| **MEDIUM** | Data lifecycle | Retention, soft-delete, GDPR erasure. |
| **LOW** | Naming & typing | UUID v7 pks, enums, minor-unit money, `Json` discipline. |

## Quick reference — the rules

### 1. Migration safety (CRITICAL)
- Use **expand/contract**: add nullable/new columns first, backfill, then enforce/deprecate — never a
  breaking change in one step. Rollbacks must not break the previously deployed app.
- Avoid long locks: adding an index on a large table uses `CREATE INDEX CONCURRENTLY` (raw SQL
  migration); avoid rewriting tables (`ALTER … SET NOT NULL` on big tables → backfill + validate).
- **Backfills are batched** (e.g., 5k rows) and idempotent, run as a job — never a single giant `UPDATE`.
- Run every migration through the migration-auditor checklist before merge.

### 2. Multi-tenant isolation (CRITICAL)
- Tenant tables carry `organizationId`. Repositories **always** filter by it; RLS policy
  `organizationId = current_setting('app.current_org')::uuid` is a backstop, not a substitute.
- Set `SET LOCAL app.current_org = $orgId` at the start of each tenant transaction.
- Global tables have no RLS — never write tenant-owned data into them.

### 3. Idempotency & constraints (CRITICAL)
- `Signal` dedupes on `@@unique([sourceId, externalId])`; `Score` caches on
  `@@unique([trendId, dimension, rubricVersion])`; join tables use composite `@@id`.
- Prefer `upsert` on these keys; never blind-`create` in ingestion/scoring.

### 4. Indexing (HIGH)
- Index every column used in a `where`/`orderBy` on a hot path: `Trend(status, lastSignalAt)`,
  `Score(dimension, value)`, `AuditLog(organizationId, createdAt)`.
- FTS: `tsvector` GIN index on `Trend(title, summary)`. Semantic: `pgvector` **HNSW** (cosine) on
  `Embedding.embedding`.
- Composite index column order = equality columns first, then range/sort.

### 5. Query shape (HIGH)
- `select` only needed fields; never fetch `Json` blobs you won't use.
- Kill N+1 with `include` or an `in (...)` batch; never query inside a loop.
- Paginate with a cursor (indexed column), not offset, on large tables.

### 6. Vector & FTS (MEDIUM)
- pgvector column + HNSW index are added via a **raw SQL migration** (not expressible in PSL).
- Choose distance to match the embedding model (cosine for normalized embeddings). Store provenance
  (`ownerType/ownerId`, model, dims). Rerank after kNN for quality (see `rag` skill).

### 7. Data lifecycle (MEDIUM)
- Soft-delete user-facing tenant rows (`deletedAt`); a hard-erasure job satisfies GDPR account deletion.
- Prune/aggregate raw `Signal` payloads after N days; retain `AuditLog` per compliance.
- Partition `Signal`/`AuditLog` by month at scale (documented; enable when needed).

## Patterns — good vs bad

**Tenant-scoped repository (no leaks, no N+1):**
```ts
// ❌ BAD — no org scope, fetches everything, N+1 on scores
const wls = await prisma.watchlist.findMany();
for (const w of wls) w.items = await prisma.watchlistItem.findMany({ where: { watchlistId: w.id } });

// ✅ GOOD — scoped, single query, only needed fields
export function listWatchlists(orgId: string, limit = 25) {
  return prisma.watchlist.findMany({
    where: { organizationId: orgId },
    take: Math.min(limit, 100),
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, items: { select: { id: true, targetType: true, targetId: true } } },
  });
}
```

**Idempotent ingestion upsert:**
```ts
// ✅ GOOD — dedupes on the unique key; safe under at-least-once delivery
await prisma.signal.upsert({
  where: { sourceId_externalId: { sourceId, externalId } },
  create: { sourceId, externalId, url, title, raw },
  update: { title, url },
});
```

**Semantic search (raw SQL for the vector op):**
```ts
// ✅ GOOD — HNSW cosine kNN via $queryRaw; rerank downstream
const rows = await prisma.$queryRaw<Array<{ ownerId: string; dist: number }>>`
  SELECT "ownerId", embedding <=> ${queryVec}::vector AS dist
  FROM "Embedding" WHERE "ownerType" = 'TREND'
  ORDER BY embedding <=> ${queryVec}::vector LIMIT 50`;
```

**Safe migration (expand/contract):**
```sql
-- ✅ GOOD — additive, no lock, backfilled separately, enforced later
ALTER TABLE "Trend" ADD COLUMN "score_version" text;          -- 1) add nullable
-- 2) batched backfill job populates score_version
CREATE INDEX CONCURRENTLY "Trend_score_version_idx" ON "Trend"("score_version");  -- 3) concurrent
-- 4) a later migration sets NOT NULL after backfill validates
```

## Step-by-step: schema change + migration

1. Edit `schema.prisma`; keep it additive (expand phase).
2. `pnpm --filter @aioi/database migrate:dev --name <slug>` → review generated SQL.
3. For indexes on big tables / vector columns, hand-edit the migration to `CONCURRENTLY` / raw SQL.
4. Write a **batched, idempotent backfill** job if data must be populated.
5. Run the migration-auditor checklist (locks, tenant isolation, reversibility).
6. Add/adjust indexes for any new query; add a repo function (tenant-scoped).
7. Update ERD/DATABASE_DESIGN + CHANGELOG + changeset. Test against a live DB in CI (`migrate deploy`).

## Decision guide

| Need | Use | Avoid |
|---|---|---|
| Exact/keyword match search | Postgres FTS (`tsvector` GIN) | `LIKE '%…%'` scans |
| Similarity/semantic search | pgvector HNSW (cosine) | Brute-force in app memory |
| Add index to a big table | `CREATE INDEX CONCURRENTLY` | Plain `CREATE INDEX` (locks) |
| Enforce NOT NULL on big table | add nullable → backfill → set NOT NULL | one-step `SET NOT NULL` |
| Multi-write | `$transaction` | sequential writes |
| Store flexible payload | typed `Json` + Zod on read | untyped sprawl |

## Failure modes → fixes

| Symptom | Cause | Fix |
|---|---|---|
| Migration hangs / times out in prod | table-rewriting or locking DDL | expand/contract; `CONCURRENTLY`; batch backfill |
| Cross-tenant rows returned | missing `organizationId` filter / RLS off | scope repo; set `app.current_org`; add test |
| Duplicate signals/scores | wrong/missing unique key | add `@@unique`; use `upsert` |
| Slow dashboard query | table scan / N+1 | add composite index; `include`/batch; `EXPLAIN ANALYZE` |
| Poor semantic recall | wrong distance / no HNSW / bad chunking | match distance to model; add HNSW; fix chunking |
| GDPR delete leaves data | soft-delete only | run hard-erasure cascade job |

## Pre-delivery checklist

- [ ] Migration is expand/contract; no table-rewrite; big-table indexes `CONCURRENTLY`
- [ ] Reversible; rollback doesn't break the previously deployed app
- [ ] Backfills batched + idempotent (job, not one `UPDATE`)
- [ ] Tenant tables carry `organizationId`; repos scope by it; RLS policy present
- [ ] Correct unique constraints for idempotency (signal dedupe, score cache)
- [ ] Indexes for every new `where`/`orderBy`; verified with `EXPLAIN ANALYZE`
- [ ] Vector column has HNSW index + correct distance; FTS has GIN index
- [ ] Only needed columns selected; no N+1
- [ ] Soft-delete + GDPR erasure considered; retention noted
- [ ] `migrate deploy` green in CI; ERD/docs + CHANGELOG + changeset updated

## References
[DATABASE_DESIGN](../../../docs/04-data/DATABASE_DESIGN.md) · [ERD](../../../docs/04-data/ERD.md) ·
[TRD §multi-tenancy](../../../docs/01-product/TECHNICAL_REQUIREMENTS_DOCUMENT.md) · skills: `backend`, `caching`, `rag`, `security`.
