---
"@aioi/web": minor
"@aioi/database": minor
---

AI & Tech Intelligence vertical — M7 (dashboard). New pages in apps/web (RSC, force-dynamic, reusing the
design tokens): `/feed` — the AI/tech news feed with region/category/sort filters + hybrid search (native
GET form, no client JS); `/feed/[id]` — article detail rendering the full analysis (TLDR, executive
summary, why-it-matters, all nine opportunity axes with color-coded scores, action items, skills,
companies, tech); `/map` — a region heatmap (analyzed-signal volume + avg opportunity, cells linking into
the filtered feed); `/models` — the open-source model tracker table (license/params/GGUF/Ollama/vLLM/MLX).
Adds `newsRegionStats` to @aioi/database and News/Models/Map to the primary nav. Verified live end-to-end
against seeded data. Design: AI_TECH_INTELLIGENCE_MODULE.md; ADR-0009.
