---
"@aioi/ai-service": patch
"@aioi/database": patch
---

Fix regional coverage (Japan and other region-tagged feeds showing 0 on the map). A source's explicit
region tag is now authoritative in `buildAnalysisInput` — a Japan/Korea/China-focused feed is regional
coverage regardless of which global company a given story name-drops, where before the model over-assigned
US/OTHER and the source tag never won. Adds `retagAnalysisRegionsToSource` (cheap, no LLM) to realign
historical analyses to their source region, wired into the refresh pipeline so existing rows re-bucket on
the next run. Untagged/global feeds still use the model's region.
