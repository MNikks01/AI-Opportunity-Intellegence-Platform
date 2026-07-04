# Entity-Relationship Diagram (ERD)

**Phase 13 · Status: complete · Last updated: 2026-07-03**
**Companion to:** [DATABASE_DESIGN](DATABASE_DESIGN.md). Rendered from Mermaid.

```mermaid
erDiagram
  Organization ||--o{ Membership : has
  Organization ||--o{ Workspace : owns
  Organization ||--|| Subscription : bills
  Organization ||--o{ ApiKey : issues
  Organization ||--o{ AuditLog : records
  User ||--o{ Membership : joins
  Workspace ||--o{ Watchlist : contains
  Watchlist ||--o{ WatchlistItem : includes
  Watchlist ||--o{ Alert : triggers
  Workspace ||--o{ Report : saves
  Organization ||--o{ Brief : receives

  Source ||--o{ IngestionRun : executes
  Source ||--o{ Signal : produces
  Trend ||--o{ TrendSignal : clusters
  Signal ||--o{ TrendSignal : partOf
  Trend ||--o{ TrendEntity : references
  Entity ||--o{ TrendEntity : appearsIn
  Trend ||--o{ Score : scored_by
  Trend ||--|| ActionPlan : generates
  Trend ||--o{ Embedding : indexed_by
  Entity ||--o{ Embedding : indexed_by

  WatchlistItem }o--|| Trend : tracks
  WatchlistItem }o--|| Entity : tracks

  Organization {
    uuid id PK
    string slug
  }
  Workspace {
    uuid id PK
    uuid organizationId FK
    enum kind
  }
  Membership {
    uuid id PK
    uuid organizationId FK
    uuid userId FK
    enum role
  }
  Source {
    uuid id PK
    string key
    enum legalityTier
  }
  Signal {
    uuid id PK
    uuid sourceId FK
    string externalId
    json raw
  }
  Trend {
    uuid id PK
    string slug
    enum status
  }
  Score {
    uuid id PK
    uuid trendId FK
    enum dimension
    int value
    float confidence
    string rubricVersion
  }
  Entity {
    uuid id PK
    enum type
    string name
  }
  Watchlist {
    uuid id PK
    uuid workspaceId FK
  }
  ApiKey {
    uuid id PK
    uuid organizationId FK
    string hashedKey
  }
  AuditLog {
    uuid id PK
    uuid organizationId FK
    string action
  }
```

## Legend & notes

- **Global (shared intelligence):** Source, IngestionRun, Signal, Trend, TrendSignal, Entity,
  TrendEntity, Score, ActionPlan, Embedding.
- **Tenant-owned (RLS by `organizationId`):** Organization, Workspace, Membership, User(link),
  Watchlist(+Item), Alert, Brief, Report, ApiKey, Subscription, AuditLog.
- `WatchlistItem` polymorphically tracks either a `Trend` or an `Entity` (typed discriminator).
- `Score` is versioned by `rubricVersion` (history preserved; latest = current rubric).
