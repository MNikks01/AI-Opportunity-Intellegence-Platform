---
"@aioi/ai-sdk": minor
---

Langfuse LLM tracing (B-007). A provider-agnostic tracing seam in `@aioi/ai-sdk` (`Tracer` /
`NoopTracer` / `LangfuseTracer` + `getTracer`) wraps every `LiteLLMProvider` model call (scoring,
action plans, entity extraction) in a generation span recording model, input, output, latency, and
OpenAI-compatible token usage. It activates only when `LANGFUSE_PUBLIC_KEY` + `LANGFUSE_SECRET_KEY` are
set — otherwise a `NoopTracer` records nothing, so scoring stays reproducible and CI green with zero
keys. The Langfuse client is imported lazily, so the no-keys path never loads the dependency (keeps the
web/RSC bundle lean), and all tracing is best-effort (never blocks or throws into the LLM path).
