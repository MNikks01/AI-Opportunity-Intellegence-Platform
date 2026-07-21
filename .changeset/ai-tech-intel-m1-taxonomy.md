---
"@aioi/database": minor
---

AI & Tech Intelligence vertical — M1 (taxonomy + schema). Additive, lock-safe migration adding the
`Region` enum, `Category` + `SignalCategory` (content taxonomy with classifier confidence),
`SignalAnalysis` (1:1 per-article enrichment payload for the per-article analysis chosen in ADR-0009),
and `ModelCard` (open-source model tracking detail on Entity type=MODEL); plus nullable `region` /
`defaultCategoryKey` on `Source`. Ships the canonical `CATEGORY_REGISTRY` (18 categories) with an
idempotent `seedCategories()` and `listCategories()` / `getCategoryByKey()` read helpers. Design:
docs/02-architecture/AI_TECH_INTELLIGENCE_MODULE.md; decisions: ADR-0009.
