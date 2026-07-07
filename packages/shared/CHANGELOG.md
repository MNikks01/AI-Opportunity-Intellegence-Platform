# @aioi/shared

## 0.1.0

### Minor Changes

- aa401cc: Add `sanitizeText()` and apply it to source-derived text on write. Fixes a crash where a title truncated
  mid-emoji (e.g. a YouTube video sliced to build a cluster label) left a lone UTF-16 surrogate, making the
  Prisma query engine throw `unexpected end of hex escape` on `trend.create`. Also strips NUL and C0/C1
  control chars. Applied in `createTrendFromSignalIds` (title/summary) and signal ingestion (title).
