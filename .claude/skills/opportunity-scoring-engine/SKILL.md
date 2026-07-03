---
name: opportunity-scoring-engine
description: Use when generating, changing, or reviewing any of the platform's AI opportunity scores for a trend (Opportunity, Business, Developer, Creator, SEO, Competition, Monetization, Risk, Difficulty, Predicted-Lifetime, and the suggestion outputs). Enforces a versioned rubric, a strict JSON output schema, cited rationale + confidence, provider-agnostic prompting, and a golden-set regression case for every score change. This is the product's core IP — consistency and explainability are non-negotiable.
---

# Opportunity Scoring Engine

The scores are the product. If they drift prompt-to-prompt or can't be explained, the product
has no defensible value. This skill makes scoring **deterministic in structure, rubric-anchored,
explainable, and regression-tested**.

## When to use
- Implementing/editing a scorer in `services/ai-service`.
- Changing a prompt, rubric weight, or score definition.
- Reviewing a PR that touches scoring output.

## When NOT to use
- Ingestion/connectors → `data-source-integration`.
- Building the eval harness itself → `llm-eval-harness` (this skill *produces cases for* it).

## Inputs
1. A normalized **trend record** (`SourceRecord[]` aggregated into a `Trend`).
2. The **score dimension(s)** requested.
3. The active **rubric version** from `references/scoring-rubric.md`.

## Outputs
- A structured result conforming to `references/score.schema.json` — every score is
  `{ value: 0-100, band, confidence, rationale, evidence[] }`.
- `rubricVersion` stamped on every result.
- A **Langfuse trace** tagged with `rubricVersion`, model, and cost.
- A **golden-set case** added/updated under `services/ai-service/eval/golden/` for the change.

## Workflow
1. **Load the rubric** (`references/scoring-rubric.md`). Each dimension has an explicit 0–100
   anchor scale — never score without it.
2. **Build a provider-agnostic prompt** via the `ai-sdk` package (works across
   Anthropic/OpenAI/Gemini through LiteLLM). Put the rubric anchors in the prompt.
3. **Demand structured output**: the model must return JSON matching `score.schema.json`.
   Validate with Zod on receipt; on failure, one repair retry, then quarantine + alert.
4. **Require evidence**: every score's `rationale` must cite specific fields from the trend
   (`evidence[]` = source ids / metrics used). No evidence → reject.
5. **Compute composite** scores (e.g. Opportunity) from sub-scores using the documented weights,
   not a fresh free-form model call — keeps them reproducible.
6. **Stamp + trace**: attach `rubricVersion`, log to Langfuse with cost/latency.
7. **Add a golden case**: pick a representative trend, freeze expected bands/rationale shape,
   commit it so `llm-eval-harness` catches regressions.

## Example
> Score dimension = "Monetization" for a "local LLM fine-tuning UI" trend.
Result: `{ "dimension":"monetization", "value":72, "band":"high",
"confidence":0.66, "rationale":"Clear willingness-to-pay signal: 3 paid competitors and
recurring 'take my money' comments; but low ACV for indie tooling.",
"evidence":["reddit:abc","ph:xyz","gh:123"], "rubricVersion":"2026-07-01" }`

## Best practices
- **Bands over false precision**: expose bands (low/medium/high) in UI; keep the raw 0–100 for sorting.
- **One rubric, many models**: never let provider choice change the meaning of a score.
- **Confidence is first-class** — low-confidence scores are surfaced differently in the UI.
- **Version everything**: bump `rubricVersion` on any anchor/weight change; never silently edit.
- Composite scores are computed, not re-guessed.

## Failure modes to guard against
- **Prompt drift** — same trend, different score across runs. Golden set + fixed rubric prevent this.
- **Ungrounded scores** — model invents rationale with no evidence. Enforce `evidence[]`.
- **Schema violations** silently coerced — validate strictly, don't `any`-cast.
- **Rubric edits without version bump** — invisibly breaks historical comparability.
- **Provider lock-in** — a prompt tuned only for one model; test across providers in the harness.

## Quality checklist (must all pass before merge)
- [ ] Rubric loaded; every dimension uses its anchor scale
- [ ] Output validated against `score.schema.json` (Zod), no `any`
- [ ] `rationale` present and cites `evidence[]` from the trend
- [ ] `confidence` populated
- [ ] Composite scores computed from sub-scores via documented weights
- [ ] `rubricVersion` stamped; Langfuse trace with cost/latency
- [ ] Golden-set case added/updated; `llm-eval-harness` run and green
- [ ] Prompt is provider-agnostic (verified on ≥2 providers)
