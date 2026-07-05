---
"@aioi/ingestion-service": minor
---

Prisma-backed `SignalRepository` (B-024): persists connector output to `Signal` with idempotent
`createMany({ skipDuplicates })` dedupe, ensuring the `Source` first. `createSignalRepository()` selects
Prisma when a DB is configured; `runHackerNewsIngestion` defaults to it.
