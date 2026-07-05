# @aioi/ingestion-service

## 0.1.0

### Minor Changes

- a46e4ef: Prisma-backed `SignalRepository` (B-024): persists connector output to `Signal` with idempotent
  `createMany({ skipDuplicates })` dedupe, ensuring the `Source` first. `createSignalRepository()` selects
  Prisma when a DB is configured; `runHackerNewsIngestion` defaults to it.

### Patch Changes

- Updated dependencies [5762d93]
- Updated dependencies [486c37f]
- Updated dependencies [e7d23d8]
- Updated dependencies [c01468e]
  - @aioi/database@0.4.0
  - @aioi/ai-sdk@0.1.0

## 0.0.3

### Patch Changes

- Updated dependencies [5d583c8]
- Updated dependencies [0634493]
  - @aioi/database@0.3.0
  - @aioi/validation@0.1.0
  - @aioi/ai-sdk@0.0.1

## 0.0.2

### Patch Changes

- Updated dependencies [c2a8c88]
- Updated dependencies [8a43b68]
  - @aioi/database@0.2.0

## 0.0.1

### Patch Changes

- Updated dependencies [1bc6a1b]
  - @aioi/database@0.1.0
