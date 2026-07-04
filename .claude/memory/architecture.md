# Architecture notes (memory)

Pointer: canonical design is `docs/02-architecture/SYSTEM_DESIGN.md`. Quick reminders:

- Sync plane: web ⇄ api (tRPC internal, REST public). Async plane: scheduler → ingestion →
  `signal.ingested` → ai-service → `trend.updated` → notification-service.
- Bus is Redis Streams/BullMQ behind a thin interface (swappable to NATS/SQS).
- Global intelligence (Signal/Trend/Score/Entity) vs tenant data (Workspace/Watchlist/…) separated.
- Scoring composite is COMPUTED from sub-scores (never re-prompted); cached by rubric version.
