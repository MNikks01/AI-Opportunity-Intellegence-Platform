---
"@aioi/database": patch
---

Fix empty category taxonomy in production. The refresh pipeline (`scripts/demo-data.ts`) never seeded the
Category table, so `/api/v1/categories` returned `[]`, news items had no category tags, and the feed's
category filter was non-functional. The pipeline now calls `seedCategories()` (idempotent) before
analysis, and `backfillSignalCategoriesFromPayload()` links categories for signals analyzed before the
taxonomy existed (from their stored analysis payload). Verified: 18 categories seeded, signal category
links created.
