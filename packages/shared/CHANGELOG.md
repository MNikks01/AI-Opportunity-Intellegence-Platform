# @aioi/shared

## 0.2.0

### Minor Changes

- 746979c: Build kit: on a trend's detail page, assemble its action plan into a rigorous, ready-to-paste scaffold
  prompt for an AI coding agent (Claude Code / Cursor / v0) — a full engineering brief (role, task,
  requirements, coding standards, security, performance, UX, definition of done, decision priority) with
  copy + download. New deterministic `buildScaffoldPrompt` in @aioi/shared. The last mile of "signal → shipped".

## 0.1.0

### Minor Changes

- aa401cc: Add `sanitizeText()` and apply it to source-derived text on write. Fixes a crash where a title truncated
  mid-emoji (e.g. a YouTube video sliced to build a cluster label) left a lone UTF-16 surrogate, making the
  Prisma query engine throw `unexpected end of hex escape` on `trend.create`. Also strips NUL and C0/C1
  control chars. Applied in `createTrendFromSignalIds` (title/summary) and signal ingestion (title).
