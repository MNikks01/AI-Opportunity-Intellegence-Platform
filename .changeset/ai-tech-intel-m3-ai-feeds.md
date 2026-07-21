---
"@aioi/ingestion-service": minor
"@aioi/database": minor
"@aioi/shared": minor
---

AI & Tech Intelligence vertical — M3 (AI feed expansion + source tagging). Adds three big-tech AI feeds
to the RSS registry — NVIDIA Blog, Microsoft Research, Meta Engineering (all verified live 2026-07-21,
filtered to AI-relevant) — and tags every feed with an optional `region` and `defaultCategoryKey`
(company/lab feeds get their home region + a fallback category; global publishers stay untagged so the
per-article classifier decides). `SourceRecord` carries these source-level tags, `ensureSource(key, tier,
tags)` persists them to the `Source` row (set on create, synced on re-run, never cleared by an untagged
call), and the RSS connector propagates them via `normalize`. Tests: registry-tag validity, tag
propagation, and DB persistence. Design: AI_TECH_INTELLIGENCE_MODULE.md; ADR-0009.
