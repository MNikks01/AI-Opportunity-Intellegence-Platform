---
"@aioi/ai-service": minor
"@aioi/ai-sdk": minor
"@aioi/database": minor
"@aioi/validation": minor
---

AI & Tech Intelligence vertical — M4 (per-article analysis). Adds the full per-article analysis pipeline
(ADR-0009): `LLMProvider.analyzeSignal` (Stub + LiteLLM) producing a schema-validated payload — TLDR,
executive summary, the nine opportunity axes (business/career/learning/content/investment/automation/
startup/developer/freelancing, each a 1–100 score + grounded "why"), difficulty, companies, tech, skills,
region, categories, and action items (`signalAnalysisContentSchema`). The `analyzeSignals` driver runs
the three cost guardrails in order — rules relevance gate (no spend on off-topic), content-hash cache
(identical/reposted articles reuse an existing analysis), and a per-run model-call budget cap — then
persists `SignalAnalysis` + `SignalCategory` (`upsertSignalAnalysis`, `findAnalysisByContentHash`,
`listSignalsForAnalysis`). The prompt is versioned (`signal-analysis-v1`) and gated by the extended
llm-eval-harness (schema-validity, determinism, axis ranges, valid categories, gate behavior). Design:
AI_TECH_INTELLIGENCE_MODULE.md; ADR-0009.
