---
name: ai
description: >-
  Deep guidance for LLM-powered features in the AI Opportunity Intelligence Platform — all model calls
  go through @aioi/ai-sdk (LiteLLM gateway + Langfuse). Use when implementing or reviewing scoring,
  summaries, action-plan generation, embeddings, or any prompt/model/RAG work in services/ai-service
  or packages/ai-sdk: provider abstraction, structured output, cost control, caching, evaluation
  gating, and observability.
---

# AI / LLM Engineering

The AI subsystem is the product's core IP. Two rules dominate everything: **(1) every model call goes
through `@aioi/ai-sdk`** (LiteLLM → OpenAI/Anthropic/Gemini/OpenRouter; never a provider SDK directly),
and **(2) no prompt/model/RAG change ships without a green `llm-eval-harness` run.** Scoring conforms
to the `opportunity-scoring-engine` skill (versioned rubric + strict JSON schema; composite computed,
never re-prompted). See [SYSTEM_DESIGN §AI](../../../docs/02-architecture/SYSTEM_DESIGN.md).

## When to apply

- Adding/changing a scorer, summary, or action-plan generator in `services/ai-service`.
- Extending `@aioi/ai-sdk` (providers, structured output, tracing, cost caps).
- Wiring embeddings/RAG, or touching a prompt or model selection.
- Reviewing any PR that changes model behavior, prompts, or the rubric.

## Rule categories by priority

| Priority | Category | Why |
|---|---|---|
| **CRITICAL** | Eval gating | Silent quality regressions destroy trust in the scores. |
| **CRITICAL** | Structured, validated output | Unvalidated model JSON corrupts the data model. |
| **CRITICAL** | Grounding & determinism-of-structure | Scores must cite evidence; composite must be computed. |
| **HIGH** | Provider abstraction | Provider choice must be a config decision, not a rewrite. |
| **HIGH** | Cost control | Per-trend multi-score generation is token-heavy; it must be capped + cached. |
| **HIGH** | Observability | Every call traced (cost/tokens/latency/prompt version) in Langfuse. |
| **MEDIUM** | Prompt versioning | Prompts change; comparability requires versions + golden cases. |
| **MEDIUM** | Failure handling | Timeouts, refusals, malformed output, provider outages. |

## Quick reference — the rules

### 1. Eval gating (CRITICAL)
- Any change to a prompt, model, rubric, or retrieval config requires a **green `llm-eval-harness`**
  run and a new/updated golden case. CI runs the smoke subset; the full suite runs nightly.
- Gate on schema-validity (hard 100%), faithfulness/relevance, band-match, **and cost/latency**.

### 2. Structured output (CRITICAL)
- Demand JSON (`response_format: json_object`) and validate with the Zod schema from
  `@aioi/validation` (`rawModelScoreSchema`, `scoreSchema`). One repair retry, then quarantine + alert.
- Never `JSON.parse` a model response without validating; never `as any`.

### 3. Grounding & composite (CRITICAL)
- Every score cites `evidence[]` (stable signal/entity ids); empty evidence is invalid.
- The composite `opportunity` is **computed** from sub-scores via rubric weights — never a fresh model
  call. Inverted dims (competition/risk/difficulty) contribute `(100 - value)`.
- Scores are cached by `(trendId, dimension, rubricVersion)`; regenerate only on material signal
  change or a rubric bump.

### 4. Provider abstraction (HIGH)
- Call `getProvider()` / the `LLMProvider` interface from `@aioi/ai-sdk`. It selects LiteLLM when a
  gateway + key are configured, else a deterministic `StubProvider` (so tests + local dev run offline).
- Prompts must be provider-agnostic; verify on ≥2 providers in the eval harness.

### 5. Cost control (HIGH)
- Draft with a cheaper model, finalize with a stronger one where quality demands it.
- Cache aggressively; batch; compress tool/RAG context (evaluate `headroom-ai`) to cut tokens 60–95%.
- Enforce org-level cost caps; tag every call's cost/latency in Langfuse; expose "LLM cost per active user".

### 6. Observability (HIGH)
- Wrap every call in a Langfuse trace tagged with `promptVersion`, model, tokens, cost, latency. OTel
  span for the surrounding operation. Never log full prompts containing PII.

### 7. Prompt versioning (MEDIUM)
- Version every prompt and the rubric (date string). Never edit silently — bump the version and add a
  golden case so historical comparisons stay valid.

### 8. Failure handling (MEDIUM)
- Timeouts + retries with backoff; LiteLLM fallback to an alternate provider on outage. Handle
  refusals and truncation explicitly. Queue-back scoring so a provider blip degrades gracefully.

## Patterns — good vs bad

**All calls through the gateway, validated:**
```ts
// ❌ BAD — direct provider SDK, unvalidated JSON, no trace/cost
const res = await openai.chat.completions.create({ model: "gpt-...", messages });
const score = JSON.parse(res.choices[0].message.content);   // could be anything

// ✅ GOOD — provider-agnostic + schema-validated + grounded
const provider = getProvider();
const raw = await provider.scoreDimension({ dimension, trendTitle, context, evidenceIds, rubricAnchor });
const score = scoreSchema.parse({ ...raw, dimension, band: bandForValue(raw.value), rubricVersion });
// evidenceIds guarantee grounding; scoreSchema enforces evidence.length >= 1
```

**Composite is computed, not prompted:**
```ts
// ❌ BAD — asking the model for the overall score (drifts, ungrounded)
const overall = await provider.ask("Give an overall opportunity score 0-100");

// ✅ GOOD — deterministic weighted blend of sub-scores (rubric)
const opportunity = computeOpportunity(subScores, trend); // inverted dims use (100 - value)
```

**Cache + gate:**
```ts
// ✅ GOOD — cache by rubric version; only regenerate on change
const key = cacheKey(trend.id, dimension, RUBRIC_VERSION);
const score = cache.get(key) ?? await generateAndValidate(dimension, trend);
cache.set(key, score);
// CI: pnpm --filter @aioi/ai-service test  -> llm-eval smoke gate must be green before merge
```

## Step-by-step: add/change an AI feature

1. Define/confirm the **output schema** in `@aioi/validation`.
2. Write the prompt/generator behind the `@aioi/ai-sdk` `LLMProvider` interface; version the prompt.
3. Implement in `services/ai-service` (structured output → Zod validate → ground with evidence →
   cache by version). Composite = computed.
4. Add a **golden case** to `llm-eval-harness`; run it; iterate until it passes (schema, faithfulness,
   band-match, cost/latency).
5. Wire the CI smoke gate; ensure Langfuse tracing + cost tags.
6. Docs (rubric/prompt version note) + CHANGELOG + changeset.

## Decision guide

| Situation | Do | Don't |
|---|---|---|
| Need an overall/derived score | compute from sub-scores | prompt the model for it |
| No API keys (dev/CI) | `StubProvider` (deterministic) | skip the feature / mock ad hoc |
| Expensive, high-volume scoring | cache + draft-cheap/finalize-strong + batch | one strong-model call per item |
| Provider outage | LiteLLM fallback + queue retry | hard-fail the request |
| New prompt wording | version + golden case + eval | edit in place |
| Large tool/RAG context | compress (headroom-ai) + trim | dump everything into the prompt |

## Failure modes → fixes

| Symptom | Cause | Fix |
|---|---|---|
| Scores drift run-to-run | prompt not versioned / composite prompted | version prompt; compute composite; eval gate |
| Data corrupted by model JSON | unvalidated output | Zod validate; one repair retry; quarantine |
| Ungrounded rationale | evidence not enforced | require `evidence[]`; pass evidenceIds |
| Runaway spend | no caps/cache | org cost cap; cache by rubric version; batch |
| Vendor lock-in | direct provider SDK | route through `@aioi/ai-sdk` (LiteLLM) |
| Quality silently drops | no eval gate | wire `llm-eval-harness` smoke to CI |

## Pre-delivery checklist

- [ ] All model calls via `@aioi/ai-sdk` (no direct provider SDK)
- [ ] Output demanded as JSON and validated with a Zod schema; repair-then-quarantine on failure
- [ ] Every score cites `evidence[]`; composite computed from sub-scores (inverted dims handled)
- [ ] Cached by `(trendId, dimension, rubricVersion)`; regenerated only on material change
- [ ] Prompt + rubric versioned; golden case added/updated
- [ ] `llm-eval-harness` green (schema, faithfulness, band-match, cost, latency); ≥2 providers
- [ ] Cost caps + Langfuse traces (promptVersion/model/tokens/cost/latency); no PII in logs
- [ ] Timeout/retry/fallback handled; scoring queue-backed
- [ ] CHANGELOG + changeset updated

## References
[SYSTEM_DESIGN](../../../docs/02-architecture/SYSTEM_DESIGN.md) · skills: `opportunity-scoring-engine`,
`llm-eval-harness`, `prompt-engineering`, `rag`, `agents`, `data-source-integration`.
