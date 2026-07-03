---
name: llm-eval-harness
description: Use when building, changing, or running evaluations for any LLM-powered feature (scoring prompts, RAG/semantic search, summaries, suggestion generators) in ai-service. Enforces a versioned golden dataset, provider-agnostic runs via LiteLLM, metrics for faithfulness/relevance/schema-validity/cost/latency, a CI pass/fail gate, and a regression diff so AI quality can never silently degrade.
---

# LLM Eval Harness

You listed Langfuse/OpenTelemetry, RAG, and semantic search but no way to *prove* the AI didn't
get worse after a prompt or model change. This skill is that proof. **No prompt/model/RAG change
merges without a green eval run.**

## When to use
- Adding/changing a prompt, chain, model, or RAG retrieval config.
- Building the eval suite for a new AI feature.
- Wiring the AI quality gate into CI.

## When NOT to use
- Authoring the scoring prompts themselves → `opportunity-scoring-engine` (it *produces* golden cases).
- Ingestion → `data-source-integration`.

## Inputs
1. The **prompt/chain/retriever** under test (referenced by id, not copy-pasted).
2. A **golden dataset** (`eval/golden/<feature>/*.json`) — inputs + expected properties.
3. **Metrics + thresholds** from `references/eval-config.template.yaml`.

## Outputs
- An **eval run report**: per-case pass/fail, aggregate metrics, cost + latency totals.
- A **regression diff** vs the last committed baseline (`eval/baselines/<feature>.json`).
- A **CI gate result** — non-zero exit if any threshold regresses beyond tolerance.
- Langfuse traces per case tagged with `evalRunId`, model, and prompt version.

## Metrics (minimum set)
- **schema-validity** — output parses against its Zod/JSON schema (hard gate: 100%).
- **faithfulness** (RAG) — claims grounded in retrieved context, not hallucinated.
- **relevance** — retrieved chunks / answer address the query (LLM-as-judge, provider-agnostic).
- **exact/band-match** — for scoring: predicted band matches expected band on golden cases.
- **cost** (USD/case) and **latency** (p50/p95) — regression-gated, not just informational.

## Workflow
1. **Assemble the golden set**: 20–50 representative cases per feature. For scoring, reuse the
   cases emitted by `opportunity-scoring-engine`. Freeze *expected properties* (bands, required
   evidence, must/must-not-contain), not brittle exact strings.
2. **Configure** metrics + thresholds from the template. Choose an **LLM judge** model distinct
   from the model under test where possible (reduce self-preference bias).
3. **Run provider-agnostically** through `ai-sdk`/LiteLLM so the same suite runs on
   Anthropic/OpenAI/Gemini — this catches provider lock-in.
4. **Diff against baseline**: compute per-metric deltas; flag any regression beyond tolerance.
5. **Gate**: fail CI on any hard-gate breach (schema validity, faithfulness) or soft-metric
   regression past tolerance. Print the offending cases.
6. **Promote baseline** only on an intentional, reviewed improvement (explicit command, not automatic).

## Example
> Changed the summary prompt to be terser.
Run: 40 golden cases across Anthropic + OpenAI. schema-validity 100%, faithfulness 0.94
(baseline 0.95 — within tolerance), relevance 0.91, cost −18% (better), p95 latency −0.4s.
Gate: **PASS**. One case regressed on "must-not-contain: speculative claims" → flagged, fixed,
re-run green before merge.

## Best practices
- **Golden set is versioned and reviewed** like code — it's your regression contract.
- **Judge ≠ subject** model when feasible; log judge rationale for auditability.
- Gate on **cost and latency**, not just quality — a 3× cost regression is a real defect.
- Keep cases deterministic in *structure*; assert properties, not exact wording.
- Run a **cheap smoke subset** on every PR; the full suite nightly.

## Failure modes to guard against
- **Overfitting to the judge** — rotate/spot-check judge with human review periodically.
- **Golden rot** — stale cases that no longer represent real trends; refresh quarterly.
- **Green-because-empty** — an eval that passes because it tested nothing; assert min case count.
- **Non-determinism masking regressions** — pin temperature low for eval runs; average over N seeds for fuzzy metrics.
- **Silent baseline auto-promotion** hiding a slow decline — promotion must be explicit + reviewed.

## Quality checklist (must all pass before merge)
- [ ] Golden set ≥ 20 cases, versioned, reviewed
- [ ] schema-validity gate = 100%
- [ ] Faithfulness/relevance thresholds met (RAG/summary features)
- [ ] Scoring band-match within tolerance vs baseline
- [ ] Cost + latency within regression tolerance
- [ ] Run across ≥2 providers via LiteLLM
- [ ] Judge model distinct from subject where feasible; judge rationale logged
- [ ] CI gate wired (smoke on PR, full nightly); non-zero exit on regression
- [ ] Baseline promotion is explicit and reviewed, never automatic
