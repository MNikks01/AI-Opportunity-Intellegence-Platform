---
"@aioi/database": minor
"@aioi/ingestion-service": minor
---

AI & Tech Intelligence vertical — M9 (model-card enrichment), the final module. Populates `ModelCard` for
tracked MODEL entities from the Hugging Face Hub API: `fetchModelDetail` + pure `parseModelCard` derive
license, parameter count, and GGUF/MLX/vLLM/transformers availability from a model's HF detail (tags,
safetensors, siblings, cardData). The `enrichModelCards` driver walks MODEL entities (the entity name is
the HF repo id), fetches each, and upserts via `upsertModelCard` (idempotent) — models not on HF (e.g.
GPT-5) return null and are skipped, best-effort per model. Adds `listModelsForEnrichment` / `upsertModelCard`
to @aioi/database. Verified against the live HF API. Completes the vertical (M1–M9). Design:
AI_TECH_INTELLIGENCE_MODULE.md; ADR-0009.
