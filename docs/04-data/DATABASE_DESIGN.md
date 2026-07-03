# Database Design

**Phase 13 · Status: complete · Last updated: 2026-07-03**
**Traces to:** [PRD object model](../01-product/PRODUCT_REQUIREMENTS_DOCUMENT.md#4-the-core-object-model-product-language) · [TRD](../01-product/TECHNICAL_REQUIREMENTS_DOCUMENT.md) · [ERD](ERD.md)
**Realized in:** `packages/database` (Prisma). Engine: PostgreSQL 16 + `pgvector`.

## 1. Principles
- **Multi-tenant, shared-schema.** Every tenant-owned row carries `organizationId`; isolation via
  Postgres **Row-Level Security (RLS)** + an app-layer tenant guard (defense in depth). See MULTI_TENANCY.
- **Global vs tenant data.** `Signal`, `Trend`, `Entity`, `Source` and their scores are **global**
  (shared intelligence, not tenant-owned). Tenant-owned: `Organization`, `Workspace`, `User`,
  `Membership`, `Watchlist*`, `Alert`, `Brief`, `Report`, `ApiKey`, `Subscription`, `AuditLog`.
- **Append-only where it matters:** `AuditLog`, `IngestionRun`, `Score` history (versioned by rubric).
- **UUID v7** primary keys (time-sortable). `createdAt`/`updatedAt` on every table. Soft-delete
  (`deletedAt`) on user-facing tenant tables; hard delete honored for GDPR erasure.
- **Money & scores:** scores are `smallint` 0–100 + `band` enum; monetary in integer minor units.

## 2. Core entities (summary)
| Table | Scope | Purpose |
|---|---|---|
| `Organization` | tenant root | billing + RBAC boundary |
| `User`, `Membership` | tenant | users + role in org (Owner/Admin/Member/Billing/Viewer) |
| `Workspace` | tenant | personal/team container |
| `Source` | global | a data source + its legality classification + rate config |
| `IngestionRun` | global | one fetch execution (cursor, status, metrics) — append-only |
| `Signal` | global | one raw item from a source (deduped by `sourceId`+`externalId`) |
| `Trend` | global | cluster of signals; the consumed unit |
| `TrendSignal` | global | M:N trend↔signal with weight |
| `Entity` | global | Company/Model/Repo/Tool/MCPServer/Paper/Person |
| `TrendEntity` | global | M:N trend↔entity with role |
| `Score` | global | one dimension score for a trend @ rubricVersion (versioned) |
| `ActionPlan` | global | generated suggestions blob for a trend @ promptVersion |
| `Embedding` | global | pgvector embedding for trend/entity (semantic search/RAG) |
| `Watchlist`, `WatchlistItem` | tenant | tracked trends/entities/topics |
| `Alert` | tenant | alert rule on a watchlist (trigger, channel, cadence) |
| `Brief` | tenant | generated daily/weekly digest + delivery/open tracking |
| `Report` | tenant | saved/exported report |
| `ApiKey` | tenant | hashed, scoped, metered public-API key |
| `Subscription` | tenant | Stripe plan + entitlements |
| `AuditLog` | tenant | append-only privileged/mutating actions |
| `FeatureFlag` | global | typed flags (+ per-org overrides) |

## 3. Prisma schema (excerpt — canonical version lives in `packages/database/schema.prisma`)
```prisma
// ---------- Tenancy & identity ----------
model Organization {
  id           String   @id @default(dbgenerated("uuid_generate_v7()")) @db.Uuid
  name         String
  slug         String   @unique
  memberships  Membership[]
  workspaces   Workspace[]
  subscription Subscription?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  deletedAt    DateTime?
}

model User {
  id          String   @id @default(dbgenerated("uuid_generate_v7()")) @db.Uuid
  clerkId     String   @unique            // auth provider id (behind packages/auth)
  email       String   @unique
  name        String?
  memberships Membership[]
  createdAt   DateTime @default(now())
  deletedAt   DateTime?
}

enum Role { OWNER ADMIN MEMBER BILLING VIEWER }

model Membership {
  id             String   @id @default(dbgenerated("uuid_generate_v7()")) @db.Uuid
  organizationId String   @db.Uuid
  userId         String   @db.Uuid
  role           Role     @default(MEMBER)
  organization   Organization @relation(fields: [organizationId], references: [id])
  user           User         @relation(fields: [userId], references: [id])
  @@unique([organizationId, userId])
  @@index([userId])
}

model Workspace {
  id             String @id @default(dbgenerated("uuid_generate_v7()")) @db.Uuid
  organizationId String @db.Uuid
  name           String
  kind           WorkspaceKind @default(PERSONAL)
  watchlists     Watchlist[]
  @@index([organizationId])
}
enum WorkspaceKind { PERSONAL TEAM }

// ---------- Intelligence core (global) ----------
model Source {
  id             String  @id @default(dbgenerated("uuid_generate_v7()")) @db.Uuid
  key            String  @unique              // e.g. "github", "hackernews"
  legalityTier   LegalityTier                 // classification gate (see data-source-integration skill)
  tosUrl         String?
  rateConfig     Json                         // limits, backoff
  enabled        Boolean @default(true)
  runs           IngestionRun[]
  signals        Signal[]
}
enum LegalityTier { OFFICIAL LICENSED GRAY PROHIBITED }

model Signal {
  id          String   @id @default(dbgenerated("uuid_generate_v7()")) @db.Uuid
  sourceId    String   @db.Uuid
  externalId  String                          // stable id at source (dedupe)
  url         String?
  title       String?
  raw         Json                            // normalized payload (validated by Zod)
  publishedAt DateTime?
  fetchedAt   DateTime @default(now())
  source      Source   @relation(fields: [sourceId], references: [id])
  trends      TrendSignal[]
  @@unique([sourceId, externalId])            // idempotent ingestion
  @@index([publishedAt])
}

model Trend {
  id          String   @id @default(dbgenerated("uuid_generate_v7()")) @db.Uuid
  slug        String   @unique
  title       String
  summary     String?                         // executive summary (AI)
  status      TrendStatus @default(EARLY)     // EARLY|ACTIVE|FADING|ARCHIVED
  firstSeenAt DateTime @default(now())
  lastSignalAt DateTime?
  signals     TrendSignal[]
  entities    TrendEntity[]
  scores      Score[]
  actionPlan  ActionPlan?
  @@index([status, lastSignalAt])
}
enum TrendStatus { EARLY ACTIVE FADING ARCHIVED }

enum ScoreDimension { OPPORTUNITY BUSINESS DEVELOPER CREATOR SEO COMPETITION MONETIZATION RISK DIFFICULTY PREDICTED_LIFETIME }
enum ScoreBand { LOW MEDIUM HIGH }

model Score {
  id            String   @id @default(dbgenerated("uuid_generate_v7()")) @db.Uuid
  trendId       String   @db.Uuid
  dimension     ScoreDimension
  value         Int      @db.SmallInt         // 0..100
  band          ScoreBand
  confidence    Float                         // 0..1
  rationale     String
  evidence      Json                          // signal/entity ids
  rubricVersion String
  createdAt     DateTime @default(now())
  trend         Trend    @relation(fields: [trendId], references: [id])
  @@unique([trendId, dimension, rubricVersion]) // cache key; history via versions
  @@index([dimension, value])
}

model Entity {
  id       String @id @default(dbgenerated("uuid_generate_v7()")) @db.Uuid
  type     EntityType
  name     String
  externalRefs Json                           // {github, homepage, hf, crunchbase...}
  trends   TrendEntity[]
  @@index([type, name])
}
enum EntityType { COMPANY MODEL REPO TOOL MCP_SERVER PAPER PERSON }

// Embeddings for semantic search / RAG (pgvector). vector col added via raw migration.
// model Embedding { id, ownerType(TREND|ENTITY), ownerId, embedding vector(1536), @@index HNSW }

// ---------- Tenant surfaces ----------
model Watchlist {
  id          String @id @default(dbgenerated("uuid_generate_v7()")) @db.Uuid
  organizationId String @db.Uuid
  workspaceId String @db.Uuid
  name        String
  items       WatchlistItem[]
  alerts      Alert[]
  @@index([workspaceId])
}

model ApiKey {
  id          String @id @default(dbgenerated("uuid_generate_v7()")) @db.Uuid
  organizationId String @db.Uuid
  name        String
  hashedKey   String @unique                  // store hash only
  scopes      String[]
  lastUsedAt  DateTime?
  revokedAt   DateTime?
  @@index([organizationId])
}

model AuditLog {
  id          String @id @default(dbgenerated("uuid_generate_v7()")) @db.Uuid
  organizationId String @db.Uuid
  actorUserId String? @db.Uuid
  action      String                          // e.g. "watchlist.create"
  targetType  String?
  targetId    String?
  ip          String?
  metadata    Json?
  createdAt   DateTime @default(now())
  @@index([organizationId, createdAt])
}
```
*(Watchlist items, alerts, brief, report, subscription, feature flags follow the same patterns; full
schema in `packages/database`.)*

## 4. Multi-tenancy & RLS
- Session sets `app.current_org` (via `SET LOCAL`); RLS policy: `organizationId = current_setting('app.current_org')::uuid`
  on every tenant table. Global tables have no RLS (read-only shared intelligence).
- App-layer `tenantGuard` also injects `organizationId` on every query as belt-and-suspenders.

## 5. Indexing & performance
- Dedupe unique index `Signal(sourceId, externalId)`; score cache unique `Score(trendId,dimension,rubricVersion)`.
- Dashboard hot paths: `Trend(status,lastSignalAt)`, `Score(dimension,value)`, `AuditLog(orgId,createdAt)`.
- Full-text search: Postgres `tsvector` GIN index on `Trend(title,summary)`.
- Semantic search: `pgvector` HNSW index on `Embedding.embedding` (cosine).
- Partition `Signal` and `AuditLog` by month at scale (documented, not enabled at MVP).

## 6. Migrations, backup, retention
- Prisma Migrate; every migration reviewed by the (to-author) `prisma-migration-auditor` skill for lock
  safety + tenant-isolation. Backfills batched. See DISASTER_RECOVERY/BACKUP (Phase 16 dir).
- Retention: raw `Signal` payloads pruned/aggregated after N days; `AuditLog` retained per compliance.
- GDPR: `deletedAt` soft-delete + a hard-erasure job for account deletion (cascades tenant data).

## 7. Review checklist
- [x] Every PRD object has a table; global vs tenant scope explicit.
- [x] Idempotent ingestion (unique dedupe) + score cache key modeled.
- [x] Multi-tenancy via RLS + app guard; audit log append-only.
- [x] Indexes for every hot query; FTS + pgvector for search.
- [x] GDPR erasure + retention modeled; migrations gated for safety.
